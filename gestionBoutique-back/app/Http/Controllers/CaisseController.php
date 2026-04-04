<?php

namespace App\Http\Controllers;

use App\Models\Caisse;
use App\Models\MouvementCaisse;
use App\Models\BilanCaisse;
use App\Models\Employe;
use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class CaisseController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // GET /caisse/moi
    // ─────────────────────────────────────────────────────────────────────────
        
    public function maCaisse(Request $request)
    {
        $actor  = $this->getActor();
        $caisse = Caisse::pour($actor);
        $alerte = $caisse->statutAlerte();

        $mouvements = MouvementCaisse::where('caisse_id', $caisse->id)
            ->whereIn('type', ['apport', 'prelevement', 'remboursement_dette'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        // ✅ Si patron → récupérer aussi les mouvements de tous les employés
        $mouvementsEmployes = collect();
        if (!($actor instanceof Employe) && $this->estPatronOuAdmin($actor)) {
            $caisseIds = Caisse::where('utilisateur_id', $actor->id)
                ->whereNotNull('employe_id') // uniquement les caisses employés
                ->pluck('id');

            $mouvementsEmployes = MouvementCaisse::whereIn('caisse_id', $caisseIds)
                ->whereIn('type', ['apport', 'prelevement', 'remboursement_dette'])
                ->with('caisse.employe') // pour avoir le nom de l'employé
                ->orderByDesc('created_at')
                ->limit(100)
                ->get()
                ->map(function ($m) {
                    // Ajouter le nom du caissier sur chaque mouvement
                    $m->caissier = $m->caisse && $m->caisse->employe
                        ? $m->caisse->employe->nom
                        : 'Patron';
                    return $m;
                });
        }

        return response()->json([
            'success'              => true,
            'caisse'               => $caisse,
            'statut'               => $alerte,
            'mouvements'           => $mouvements,
            'mouvements_employes'  => $mouvementsEmployes,
            'is_patron'            => !($actor instanceof Employe),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /caisse/mouvement
    // ─────────────────────────────────────────────────────────────────────────
    public function mouvement(Request $request)
    {
        $request->validate([
            'type'    => 'required|in:apport,prelevement',
            'montant' => 'required|numeric|min:1',
            'note'    => 'nullable|string|max:255',
        ]);

        $actor   = $this->getActor();
        $caisse  = Caisse::pour($actor);
        $type    = $request->type;
        $montant = floatval($request->montant);

        if ($type === 'prelevement' && $montant > $caisse->solde_actuel) {
            return response()->json([
                'success' => false,
                'message' => "Le montant ({$montant} F) dépasse le solde disponible ({$caisse->solde_actuel} F).",
            ], 422);
        }

        $mouvement = $type === 'prelevement'
            ? $caisse->debiter($montant, $request->note)
            : $caisse->crediter($montant, 'apport', null, $request->note);

        $caisse->refresh();

        return response()->json([
            'success'   => true,
            'mouvement' => $mouvement,
            'caisse'    => $caisse,
            'statut'    => $caisse->statutAlerte(),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /caisse/ticket/{mouvementId}
    // ─────────────────────────────────────────────────────────────────────────
    public function ticket(Request $request, int $mouvementId)
    {
        $actor  = $this->getActor();
        $caisse = Caisse::pour($actor);

        $mouvement = MouvementCaisse::where('id', $mouvementId)
            ->where('caisse_id', $caisse->id)
            ->where('type', 'prelevement')
            ->firstOrFail();

        $boutique   = $this->getBoutique($actor);
        $nom_acteur = $this->getNomActeur($actor);

        $pdf = Pdf::loadView('caisse.ticket_prelevement', [
            'mouvement'  => $mouvement,
            'caisse'     => $caisse,
            'acteur'     => $actor,
            'boutique'   => $boutique,
            'nom_acteur' => $nom_acteur,
        ])->setPaper([0, 0, 226.77, 500], 'portrait');

        return $pdf->download("Ticket_{$mouvement->ticket_reference}.pdf");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /caisse/bilan
    // Chaque acteur fait le bilan de SA PROPRE caisse uniquement
    // ─────────────────────────────────────────────────────────────────────────
    public function bilan(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'solde_reel' => 'required|numeric|min:0',
        ]);

        $actor  = $this->getActor();
        $caisse = Caisse::pour($actor);

        $bilan = $this->calculerEtSauvegarderBilan(
            $caisse,
            $request->start_date,
            $request->end_date,
            floatval($request->solde_reel),
            $actor
        );

        return response()->json([
            'success' => true,
            'bilans'  => [$bilan],
            'periode' => ['debut' => $request->start_date, 'fin' => $request->end_date],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /caisse/bilan/ticket/{bilanId}
    // ─────────────────────────────────────────────────────────────────────────
    public function ticketBilan(Request $request, int $bilanId)
    {
        $actor = $this->getActor();

        $bilan = BilanCaisse::where('id', $bilanId)
            ->where('utilisateur_id', $this->utilisateurId($actor))
            ->firstOrFail();

        $boutique = $this->getBoutique($actor);

        $pdf = Pdf::loadView('caisse.ticket_bilan', [
            'bilan'    => $bilan,
            'boutique' => $boutique,
        ])->setPaper([0, 0, 226.77, 600], 'portrait');

        return $pdf->download("Bilan_{$bilan->ticket_reference}.pdf");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /caisse/bilans  (patron uniquement)
    // ─────────────────────────────────────────────────────────────────────────
    public function historiqueBilans(Request $request)
    {
        $actor = $this->getActor();

        if (!$this->estPatronOuAdmin($actor)) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $query = BilanCaisse::where('utilisateur_id', $this->utilisateurId($actor))
            ->with(['caisse.employe'])
            ->orderByDesc('created_at');

        if ($request->filled('caisse_id'))    $query->where('caisse_id',    $request->caisse_id);
        if ($request->filled('statut_ecart')) $query->where('statut_ecart', $request->statut_ecart);
        if ($request->filled('start_date'))   $query->where('date_debut',   '>=', $request->start_date);
        if ($request->filled('end_date'))     $query->where('date_fin',     '<=', $request->end_date);

        $bilans = $query->paginate(20);

        $bilans->getCollection()->transform(function (BilanCaisse $b) {
            $acteur = $b->caisse && $b->caisse->employe
                ? $b->caisse->employe->nom
                : 'Patron';
            return array_merge($b->toArray(),  
                 ['acteur' => $acteur,
                 'bilan_id' => $b->id,
                 ]);
        });

        return response()->json(['success' => true, 'bilans' => $bilans]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /caisse/toutes  (patron uniquement)
    // ─────────────────────────────────────────────────────────────────────────
    public function toutes(Request $request)
    {
        $actor = $this->getActor();

        if (!$this->estPatronOuAdmin($actor)) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $caisses = Caisse::where('utilisateur_id', $this->utilisateurId($actor))
            ->with(['employe'])
            ->get()
            ->map(function (Caisse $caisse) {
                $alerte = $caisse->statutAlerte();
                return [
                    'id'           => $caisse->id,
                    'acteur'       => $caisse->employe ? $caisse->employe->nom : 'Patron',
                    'role'         => $caisse->employe ? $caisse->employe->role : 'patron',
                    'solde_actuel' => $caisse->solde_actuel,
                    'plafond'      => $caisse->plafond,
                    'pourcentage'  => $alerte['pourcentage'],
                    'niveau'       => $alerte['niveau'],
                    'statut'       => $alerte,
                    'est_bloquee'  => $caisse->est_bloquee,
                ];
            });

        return response()->json(['success' => true, 'caisses' => $caisses]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /caisse/{id}/plafond  (patron uniquement)
    // ─────────────────────────────────────────────────────────────────────────
    public function modifierPlafond(Request $request, int $id)
    {
        $actor = $this->getActor();

        if (!$this->estPatronOuAdmin($actor)) {
            return response()->json(['success' => false, 'message' => 'Seul le patron peut modifier le plafond.'], 403);
        }

        $request->validate([
            'plafond'     => 'required|numeric|min:1000',
            'est_bloquee' => 'nullable|boolean',
        ]);

        $caisse = Caisse::where('id', $id)
            ->where('utilisateur_id', $this->utilisateurId($actor))
            ->firstOrFail();

        $caisse->plafond     = floatval($request->plafond);
        $caisse->est_bloquee = $request->boolean('est_bloquee', $caisse->est_bloquee);
        $caisse->save();

        return response()->json([
            'success' => true,
            'message' => 'Plafond mis à jour.',
            'caisse'  => $caisse,
            'statut'  => $caisse->statutAlerte(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /caisse/plafond-global  (patron uniquement)
    // ─────────────────────────────────────────────────────────────────────────
    public function modifierPlafondGlobal(Request $request)
    {
        $actor = $this->getActor();

        if (!$this->estPatronOuAdmin($actor)) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $request->validate(['plafond' => 'required|numeric|min:1000']);

        $count = Caisse::where('utilisateur_id', $this->utilisateurId($actor))
            ->update(['plafond' => floatval($request->plafond)]);

        return response()->json([
            'success' => true,
            'message' => "{$count} caisse(s) mise(s) à jour — plafond : "
                . number_format($request->plafond, 0, ',', ' ') . " F.",
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS PRIVÉS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * ✅ Détecte l'acteur connecté en testant les deux guards JWT.
     *
     * Votre auth.php définit :
     *   - guard 'api'     → driver jwt → provider Utilisateur (patron)
     *   - guard 'employe' → driver jwt → provider Employe
     *
     * On teste 'employe' EN PREMIER car si le token est un token employé
     * et qu'on essaie 'api' (provider Utilisateur), JWT retourne null
     * au lieu de lever une exception → sans risque de crash.
     */
    private function getActor()
    {
        // ── 1. Essai guard employé ────────────────────────────────────────────
        try {
            $employe = auth('employe')->user();
            if ($employe instanceof Employe) {
                return $employe;
            }
        } catch (\Exception $e) {
            // Token non valide pour ce guard → on continue
        }

        // ── 2. Essai guard patron ─────────────────────────────────────────────
        try {
            $utilisateur = auth('api')->user();
            if ($utilisateur instanceof Utilisateur) {
                return $utilisateur;
            }
        } catch (\Exception $e) {
            // Token non valide pour ce guard → on continue
        }

        abort(401, 'Non authentifié.');
    }

    private function calculerEtSauvegarderBilan(
        Caisse $caisse,
        string $debut,
        string $fin,
        float  $soldeReel,
        $actor
    ): array {
        $mouvements     = MouvementCaisse::where('caisse_id', $caisse->id)
            ->whereBetween('created_at', [$debut . ' 00:00:00', $fin . ' 23:59:59'])
            ->get();

        $entrees        = $mouvements->whereIn('type', ['vente', 'apport', 'remboursement_dette'])->sum('montant');
        $sorties        = $mouvements->where('type', 'prelevement')->sum('montant');
        $soldeDebut     = $this->calculerSoldeDebut($caisse, $debut);
        $soldeTheorique = $soldeDebut + $entrees - $sorties;
        $ecart          = $soldeReel - $soldeTheorique;

        $statutEcart = match(true) {
            $ecart == 0 => 'equilibre',
            $ecart > 0  => 'surplus',
            default     => 'manquant',
        };

        $reference = 'BILAN-' . now()->format('Ymd') . '-'
            . str_pad(BilanCaisse::whereDate('created_at', today())->count() + 1, 4, '0', STR_PAD_LEFT);

        $bilan = BilanCaisse::create([
            'caisse_id'             => $caisse->id,
            'utilisateur_id'        => $this->utilisateurId($actor),
            'date_debut'            => $debut,
            'date_fin'              => $fin,
            'solde_debut'           => $soldeDebut,
            'total_entrees'         => $entrees,
            'total_sorties'         => $sorties,
            'solde_theorique'       => $soldeTheorique,
            'solde_reel'            => $soldeReel,
            'ecart'                 => $ecart,
            'nombre_ventes'         => $mouvements->where('type', 'vente')->count(),
            'nombre_remboursements' => $mouvements->where('type', 'remboursement_dette')->count(),
            'nombre_prelevements'   => $mouvements->where('type', 'prelevement')->count(),
            'statut_ecart'          => $statutEcart,
            'ticket_reference'      => $reference,
            'effectue_par'          => $this->getNomActeur($actor),
        ]);

        return [
            'bilan_id'              => $bilan->id,
            'acteur'                => $caisse->employe ? $caisse->employe->nom : 'Patron',
            'caisse_id'             => $caisse->id,
            'ticket_reference'      => $reference,
            'solde_debut'           => $soldeDebut,
            'total_entrees'         => $entrees,
            'total_sorties'         => $sorties,
            'solde_theorique'       => $soldeTheorique,
            'solde_reel'            => $soldeReel,
            'ecart'                 => $ecart,
            'statut_ecart'          => $statutEcart,
            'nombre_ventes'         => $bilan->nombre_ventes,
            'nombre_remboursements' => $bilan->nombre_remboursements,
            'nombre_prelevements'   => $bilan->nombre_prelevements,
        ];
    }

    private function calculerSoldeDebut(Caisse $caisse, string $dateDebut): float
    {
        $mouvementsApres = MouvementCaisse::where('caisse_id', $caisse->id)
            ->where('created_at', '>=', $dateDebut . ' 00:00:00')
            ->orderByDesc('created_at')
            ->get();

        $solde = $caisse->solde_actuel;
        foreach ($mouvementsApres as $m) {
            if (in_array($m->type, ['vente', 'apport', 'remboursement_dette'])) {
                $solde -= $m->montant;
            } else {
                $solde += $m->montant;
            }
        }
        return max(0, $solde);
    }

    private function getBoutique($actor)
    {
        if ($actor instanceof Employe) {
            return Utilisateur::find($actor->utilisateur_id);
        }
        return $actor;
    }

    private function getNomActeur($actor): string
    {
        if ($actor instanceof Employe) {
            return $actor->nom ?? 'Employé';
        }
        return $actor->nom_boutique ?? $actor->nom ?? $actor->prenom ?? $actor->email ?? 'Patron';
    }

    private function estPatronOuAdmin($actor): bool
    {
        // Un Employe n'est jamais patron (role 'vendeur' ou 'caissier')
        if ($actor instanceof Employe) {
            return false;
        }
        // Un Utilisateur est toujours patron
        return true;
    }

    private function utilisateurId($actor): int
    {
        return $actor instanceof Employe
            ? $actor->utilisateur_id
            : $actor->id;
    }
}
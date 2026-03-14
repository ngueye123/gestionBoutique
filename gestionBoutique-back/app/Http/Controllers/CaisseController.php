<?php

namespace App\Http\Controllers;

use App\Models\Caisse;
use App\Models\MouvementCaisse;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class CaisseController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // GET /caisse/moi
    // ─────────────────────────────────────────────────────────────────────────
    public function maCaisse(Request $request)
    {
        $actor  = auth('api')->user();
        $caisse = Caisse::pour($actor);
        $alerte = $caisse->statutAlerte();

        $mouvements = MouvementCaisse::where('caisse_id', $caisse->id)
            ->whereIn('type', ['apport', 'prelevement', 'remboursement_dette'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'success'    => true,
            'caisse'     => $caisse,
            'statut'     => $alerte,
            'mouvements' => $mouvements,
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

        $actor   = auth('api')->user();
        $caisse  = Caisse::pour($actor);
        $type    = $request->type;
        $montant = floatval($request->montant);

        if ($type === 'prelevement' && $montant > $caisse->solde_actuel) {
            return response()->json([
                'success' => false,
                'message' => "Le montant du prélèvement ({$montant} F) dépasse le solde disponible ({$caisse->solde_actuel} F).",
            ], 422);
        }

        $mouvement = $type === 'prelevement'
            ? $caisse->debiter($montant, $request->note)
            : $caisse->crediter($montant, 'apport', null, $request->note);

        $caisse->refresh();
        $alerte = $caisse->statutAlerte();

        return response()->json([
            'success'   => true,
            'mouvement' => $mouvement,
            'caisse'    => $caisse,
            'statut'    => $alerte,
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /caisse/ticket/{mouvementId}
    // ─────────────────────────────────────────────────────────────────────────
    public function ticket(Request $request, int $mouvementId)
    {
        $actor  = auth('api')->user();
        $caisse = Caisse::pour($actor);

        $mouvement = MouvementCaisse::where('id', $mouvementId)
            ->where('caisse_id', $caisse->id)
            ->where('type', 'prelevement')
            ->firstOrFail();

        // ✅ Récupérer la boutique selon le type d'acteur
        $boutique   = $this->getBoutique($actor);

        // ✅ Nom affiché sur le ticket
        $nom_acteur = $this->getNomActeur($actor);

        $pdf = Pdf::loadView('caisse.ticket_prelevement', [
            'mouvement'  => $mouvement,
            'caisse'     => $caisse,
            'acteur'     => $actor,
            'boutique'   => $boutique,   // ✅ variable manquante ajoutée
            'nom_acteur' => $nom_acteur, // ✅ variable manquante ajoutée
        ])->setPaper([0, 0, 226.77, 500], 'portrait'); // 80mm

        return $pdf->download("Ticket_{$mouvement->ticket_reference}.pdf");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /caisse/bilan
    // ─────────────────────────────────────────────────────────────────────────
    public function bilan(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'solde_reel' => 'nullable|numeric|min:0',
        ]);

        $actor   = auth('api')->user();
        $isAdmin = $this->estPatronOuAdmin($actor);

        $caisses = $isAdmin
            ? Caisse::where('utilisateur_id', $this->utilisateurId($actor))->get()
            : collect([Caisse::pour($actor)]);

        $bilans = $caisses->map(function (Caisse $caisse) use ($request) {
            return $this->calculerBilan($caisse, $request->start_date, $request->end_date, $request->solde_reel);
        });

        return response()->json([
            'success' => true,
            'bilans'  => $bilans,
            'periode' => ['debut' => $request->start_date, 'fin' => $request->end_date],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /caisse/toutes  (patron/admin uniquement)
    // ─────────────────────────────────────────────────────────────────────────
    public function toutes(Request $request)
    {
        $actor = auth('api')->user();

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
    // PUT /caisse/{id}/plafond  (patron/admin uniquement)
    // ─────────────────────────────────────────────────────────────────────────
    public function modifierPlafond(Request $request, int $id)
    {
        $actor = auth('api')->user();

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
    // PUT /caisse/plafond-global  (patron/admin uniquement)
    // ─────────────────────────────────────────────────────────────────────────
    public function modifierPlafondGlobal(Request $request)
    {
        $actor = auth('api')->user();

        if (!$this->estPatronOuAdmin($actor)) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $request->validate([
            'plafond' => 'required|numeric|min:1000',
        ]);

        $count = Caisse::where('utilisateur_id', $this->utilisateurId($actor))
            ->update(['plafond' => floatval($request->plafond)]);

        return response()->json([
            'success' => true,
            'message' => "{$count} caisse(s) mise(s) à jour avec le plafond de "
                . number_format($request->plafond, 0, ',', ' ') . " F.",
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers privés
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Récupère la boutique selon le type d'acteur (Utilisateur ou Employé).
     * Adaptez le nom du modèle/relation selon votre structure.
     */
    private function getBoutique($actor)
    {
        // Si c'est un employé → on passe par l'utilisateur propriétaire
        if ($actor instanceof \App\Models\Employe) {
            $utilisateur = \App\Models\Utilisateur::find($actor->utilisateur_id);
            return $utilisateur;  // L'utilisateur porte les infos boutique
        }

        // Si c'est le patron/utilisateur directement
        return $actor;
    }

    /**
     * Retourne le nom affiché sur le ticket.
     */
    private function getNomActeur($actor): string
    {
        // Employé : utilise le champ nom
        if ($actor instanceof \App\Models\Employe) {
            return $actor->nom ?? $actor->prenom ?? 'Employé';
        }

        // Patron/Utilisateur : adapte selon vos champs
        return $actor->nom_boutique
            ?? $actor->nom
            ?? $actor->prenom
            ?? $actor->email
            ?? 'Patron';
    }

    private function calculerBilan(Caisse $caisse, string $debut, string $fin, ?float $soldeReel): array
    {
        $mouvements = MouvementCaisse::where('caisse_id', $caisse->id)
            ->whereBetween('created_at', [$debut . ' 00:00:00', $fin . ' 23:59:59'])
            ->get();

        $entrees    = $mouvements->whereIn('type', ['vente', 'apport', 'remboursement_dette'])->sum('montant');
        $sorties    = $mouvements->where('type', 'prelevement')->sum('montant');
        $soldeDebut = $this->calculerSoldeDebut($caisse, $debut);

        $soldeTheorique = $soldeDebut + $entrees - $sorties;

        $ecart       = $soldeReel !== null ? ($soldeReel - $soldeTheorique) : null;
        $statutEcart = match(true) {
            $ecart === null  => 'non_verifie',
            $ecart === 0.0   => 'equilibre',
            $ecart > 0       => 'surplus',
            default          => 'manquant',
        };

        return [
            'acteur'                => $caisse->employe ? $caisse->employe->nom : 'Patron',
            'caisse_id'             => $caisse->id,
            'solde_debut'           => $soldeDebut,
            'total_entrees'         => $entrees,
            'total_sorties'         => $sorties,
            'solde_theorique'       => $soldeTheorique,
            'solde_reel'            => $soldeReel,
            'ecart'                 => $ecart,
            'statut_ecart'          => $statutEcart,
            'nombre_ventes'         => $mouvements->where('type', 'vente')->count(),
            'nombre_remboursements' => $mouvements->where('type', 'remboursement_dette')->count(),
            'nombre_prelevements'   => $mouvements->where('type', 'prelevement')->count(),
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

    private function estPatronOuAdmin($actor): bool
    {
        if ($actor instanceof \App\Models\Employe) {
            return in_array($actor->role, ['patron', 'admin']);
        }
        // Un Utilisateur (non-employé) est toujours patron
        return true;
    }

    private function utilisateurId($actor): int
    {
        return $actor instanceof \App\Models\Employe
            ? $actor->utilisateur_id
            : $actor->id;
    }
}
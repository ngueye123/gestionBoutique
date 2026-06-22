<?php

namespace App\Http\Controllers;

use App\Models\Caisse;
use App\Models\MouvementCaisse;
use App\Models\BilanCaisse;
use App\Models\Employe;
use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Services\CaisseService;
use Illuminate\Support\Facades\DB;
class CaisseController extends Controller
{
     public function __construct(
        private readonly CaisseService $caisseService,
        private readonly DashboardCacheService $dashboardCache,
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // GET /caisse/moi
    // ─────────────────────────────────────────────────────────────────────────
        
    public function maCaisse(Request $request)
    {
        $actor  = $this->getActor();
        $caisse = Caisse::pour($actor);
        $alerte = $caisse->statutAlerte();

        $perPage = min((int) $request->input('per_page', 50), 100); // plafonné à 100 max

        $mouvements = MouvementCaisse::where('caisse_id', $caisse->id)
            ->whereIn('type', ['apport', 'prelevement', 'remboursement_dette'])
            ->orderByDesc('created_at')
            ->paginate($perPage); 

        // Si patron → récupérer aussi les mouvements de tous les employés
        $mouvementsEmployes = collect();
        if (!($actor instanceof Employe) && $this->estPatronOuAdmin($actor)) {
            $caisseIds = Caisse::where('utilisateur_id', $actor->id)
                ->whereNotNull('employe_id') // uniquement les caisses employés
                ->pluck('id');

           $mouvementsEmployes = MouvementCaisse::query()
            ->select(
                'mouvements_caisse.*',
                DB::raw("COALESCE(employes.nom, 'Patron') as caissier")
            )
            ->whereIn('mouvements_caisse.caisse_id', $caisseIds)
            ->whereIn('mouvements_caisse.type', ['apport', 'prelevement', 'remboursement_dette'])
            ->leftJoin('caisses', 'caisses.id', '=', 'mouvements_caisse.caisse_id')
            ->leftJoin('employes', 'employes.id', '=', 'caisses.employe_id')
            ->orderByDesc('mouvements_caisse.created_at')
            ->limit(100)
            ->get();
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

        $actor   = $this->actorResolver->resolve();
        $type    = $request->type;
        $montant = floatval($request->montant);

        DB::beginTransaction();

        try {
            $caisse = Caisse::pour($actor);

            if ($type === 'prelevement') {
                $caisseVerrouillee = Caisse::where('id', $caisse->id)->lockForUpdate()->first();

                if ($montant > $caisseVerrouillee->solde_actuel) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => "Le montant ({$montant} F) dépasse le solde disponible ({$caisseVerrouillee->solde_actuel} F).",
                    ], 422);
                }
            }

            $mouvement = $type === 'prelevement'
                ? $caisse->debiter($montant, $request->note)
                : $caisse->crediter($montant, 'apport', null, $request->note);

            DB::commit();

            $caisse->refresh();

            // Conserver l'objet Caisse complet — le frontend utilise caisse.id et caisse.est_bloquee
            return response()->json([
                'success'   => true,
                'mouvement' => $mouvement,
                'caisse'    => $caisse, // ← objet complet, PAS buildCaisseInfo()
                'statut'    => $caisse->statutAlerte(),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
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

        $bilan = $this->caisseService->calculerEtSauvegarderBilan(
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
     * Détecte l'acteur connecté en testant les deux guards JWT.
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

   

    private function getBoutique($actor)
    {
        if ($actor instanceof Employe) {
            return Utilisateur::find($actor->utilisateur_id);
        }
        return $actor;
    }

    private function getNomActeur($actor): string
    {
        return $this->caisseService->resolveNomActeur($actor);
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
        return $this->caisseService->resolveUtilisateurId($actor);
    }
}
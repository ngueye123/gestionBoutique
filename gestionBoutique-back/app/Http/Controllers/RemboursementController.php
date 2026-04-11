<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Remboursement;
use App\Models\Caisse;
use App\Models\Employe;
use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RemboursementController extends Controller
{
    use RoleHelper;

    /**
     * Résoudre l'acteur connecté (Employe ou Utilisateur/patron).
     * Même logique que CaisseController::getActor().
     */
    private function resolveActor(): Employe|Utilisateur
    {
        try {
            $employe = auth('employe')->user();
            if ($employe instanceof Employe) {
                return $employe;
            }
        } catch (\Exception $e) {}

        try {
            $utilisateur = auth('api')->user();
            if ($utilisateur instanceof Utilisateur) {
                return $utilisateur;
            }
        } catch (\Exception $e) {}

        abort(401, 'Non authentifié.');
    }

    /**
     * Enregistrer un nouveau remboursement
     * POST /api/remboursements
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id'      => 'required|integer|exists:clients,id',
            'montant'        => 'required|numeric|min:0.01',
            'moyen_paiement' => 'required|in:especes,wave,orange_money,carte',
            'note'           => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            // ── Résoudre l'acteur réel (patron OU employé) ───────────────────
            $actor     = $this->resolveActor();
            $ownerId   = $actor instanceof Employe ? $actor->utilisateur_id : $actor->id;
            $employeId = $actor instanceof Employe ? $actor->id : null;

            // Récupérer le client
            $client = Client::byUtilisateur($ownerId)->findOrFail($validated['client_id']);

            // Vérifier que le montant n'excède pas la dette
            if ($validated['montant'] > $client->solde_dette) {
                return response()->json([
                    'success' => false,
                    'message' => "Le montant ne peut pas dépasser la dette actuelle ({$client->solde_dette} F)"
                ], 400);
            }

            // Créer le remboursement
            $remboursement = Remboursement::create([
                'client_id'      => $client->id,
                'utilisateur_id' => $ownerId,
                'employe_id'     => $employeId,
                'montant'        => $validated['montant'],
                'moyen_paiement' => $validated['moyen_paiement'],
                'note'           => $validated['note'] ?? null,
            ]);

            // Mettre à jour le solde du client
            $client->reduireDette($validated['montant']);

            // ── Créditer la caisse de l'acteur si paiement en espèces ────────
            // Si c'est un employé → sa propre caisse est créditée
            // Si c'est le patron  → la caisse du patron est créditée
            $caisseInfo = null;
            if ($validated['moyen_paiement'] === 'especes') {
                $caisse = Caisse::pour($actor);
                $caisse->crediter(
                    floatval($validated['montant']),
                    'remboursement_dette',
                    null,
                    "Remboursement dette — {$client->nom}"
                );
                $caisse->refresh();

                $caisseInfo = [
                    'solde_actuel' => (float) $caisse->solde_actuel,
                    'plafond'      => (float) $caisse->plafond,
                    'pourcentage'  => $caisse->plafond > 0
                        ? round(($caisse->solde_actuel / $caisse->plafond) * 100, 1)
                        : 0,
                    'attention'    => $caisse->solde_actuel >= ($caisse->plafond * 0.8),
                ];
            }

            DB::commit();

            $remboursement->load('client', 'employe');

            return response()->json([
                'success'       => true,
                'message'       => 'Remboursement enregistré avec succès',
                'remboursement' => $remboursement,
                'nouveau_solde' => $client->fresh()->solde_dette,
                'caisse'        => $caisseInfo,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur enregistrement remboursement: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => "Erreur lors de l'enregistrement du remboursement",
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Liste des remboursements
     * GET /api/remboursements?client_id=X
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $ownerId = $this->getOwnerId();

            $query = Remboursement::with('client', 'employe')
                ->byUtilisateur($ownerId)
                ->orderBy('created_at', 'desc');

            if ($request->has('client_id')) {
                $query->where('client_id', $request->client_id);
            }

            if ($request->has('start_date') && $request->has('end_date')) {
                $query->betweenDates($request->start_date, $request->end_date);
            }

            $remboursements = $query->paginate(20);

            return response()->json([
                'success'        => true,
                'remboursements' => $remboursements
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur récupération remboursements: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des remboursements'
            ], 500);
        }
    }

    /**
     * Détails d'un remboursement
     * GET /api/remboursements/{id}
     */
    public function show(int $id): JsonResponse
    {
        try {
            $ownerId = $this->getOwnerId();

            $remboursement = Remboursement::with('client', 'employe')
                ->byUtilisateur($ownerId)
                ->findOrFail($id);

            return response()->json([
                'success'       => true,
                'remboursement' => $remboursement
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Remboursement non trouvé'
            ], 404);
        }
    }

    /**
     * Historique des remboursements d'un client
     * GET /api/clients/{id}/remboursements
     */
    public function historiqueClient(int $clientId): JsonResponse
    {
        try {
            $ownerId = $this->getOwnerId();

            $client = Client::byUtilisateur($ownerId)->findOrFail($clientId);

            $remboursements = Remboursement::with('employe')
                ->byClient($clientId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success'         => true,
                'client'          => $client,
                'remboursements'  => $remboursements,
                'total_rembourse' => $remboursements->sum('montant')
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur historique remboursements: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => "Erreur lors de la récupération de l'historique"
            ], 500);
        }
    }
}
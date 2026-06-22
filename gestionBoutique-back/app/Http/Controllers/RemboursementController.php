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
use App\Services\CaisseService;
use App\Services\DashboardCacheService;
use App\Services\ActorResolver;

class RemboursementController extends Controller
{
    use RoleHelper;

    public function __construct(
        private readonly ActorResolver $actorResolver,
        private readonly CaisseService $caisseService,
        private readonly DashboardCacheService $dashboardCache,
    ) {}
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
            $actor     = $this->actorResolver->resolve();
            $ownerId   = $actor instanceof Employe ? $actor->utilisateur_id : $actor->id;
            $employeId = $actor instanceof Employe ? $actor->id : null;

            $client = Client::byUtilisateur($ownerId)
                ->where('id', $validated['client_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($validated['montant'] > $client->solde_dette) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => "Le montant ne peut pas dépasser la dette actuelle ({$client->solde_dette} F)"
                ], 400);
            }

            $remboursement = Remboursement::create([
                'client_id'      => $client->id,
                'utilisateur_id' => $ownerId,
                'employe_id'     => $employeId,
                'montant'        => $validated['montant'],
                'moyen_paiement' => $validated['moyen_paiement'],
                'note'           => $validated['note'] ?? null,
            ]);

            $client->reduireDette($validated['montant']);

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

                // Utilise CaisseService au lieu d'une dépendance vers VenteService
                $caisseInfo = $this->caisseService->buildCaisseInfo($caisse);
            }

            DB::commit();

            $this->dashboardCache->invalidate($ownerId);

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
            Log::error('Erreur enregistrement remboursement', [
                'client_id' => $validated['client_id'] ?? null,
                'montant'   => $validated['montant'] ?? null,
                'error'     => $e->getMessage(),
            ]);
            throw $e;
        }
    }
    /**
     * Liste des remboursements
     * GET /api/remboursements?client_id=X
     */
    public function index(Request $request): JsonResponse
    {
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
    }

    /**
     * Détails d'un remboursement
     * GET /api/remboursements/{id}
     */
    public function show(int $id): JsonResponse
    {
        $ownerId = $this->getOwnerId();

        $remboursement = Remboursement::with('client', 'employe')
            ->byUtilisateur($ownerId)
            ->findOrFail($id);

        return response()->json([
            'success'       => true,
            'remboursement' => $remboursement
        ]);
    }

    /**
     * Historique des remboursements d'un client
     * GET /api/clients/{id}/remboursements
     */
    public function historiqueClient(int $clientId): JsonResponse
    {
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
    }
}
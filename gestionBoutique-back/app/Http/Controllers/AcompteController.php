<?php

namespace App\Http\Controllers;

use App\Models\Acompte;
use App\Models\Caisse;
use App\Models\Client;
use App\Models\Employe;
use App\Services\ActorResolver;
use App\Services\CaisseService;
use App\Services\DashboardCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcompteController extends Controller
{
    public function __construct(
        private readonly ActorResolver $actorResolver,
        private readonly CaisseService $caisseService,
        private readonly DashboardCacheService $dashboardCache,
    ) {}

    /**
     * Enregistre un versement qui reste disponible pour les prochaines ventes du client.
     */
    public function store(Request $request, int $clientId): JsonResponse
    {
        $validated = $request->validate([
            'montant' => 'required|integer|min:1',
            'moyen_paiement' => 'required|in:especes,wave,orange_money,carte',
            'note' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            $actor = $this->actorResolver->resolve();
            $ownerId = $actor instanceof Employe ? $actor->utilisateur_id : $actor->id;
            $employeId = $actor instanceof Employe ? $actor->id : null;

            $client = Client::byUtilisateur($ownerId)
                ->whereKey($clientId)
                ->lockForUpdate()
                ->firstOrFail();

            $acompte = Acompte::create([
                'client_id' => $client->id,
                'utilisateur_id' => $ownerId,
                'employe_id' => $employeId,
                'montant' => $validated['montant'],
                'moyen_paiement' => $validated['moyen_paiement'],
                'note' => $validated['note'] ?? null,
            ]);

            $client->ajouterAcompte($validated['montant']);

            $caisseInfo = null;
            if ($validated['moyen_paiement'] === 'especes') {
                $caisse = Caisse::pour($actor);
                $caisse->crediter(
                    $validated['montant'],
                    'acompte_client',
                    null,
                    "Acompte client - {$client->nom}"
                );
                $caisse->refresh();
                $caisseInfo = $this->caisseService->buildCaisseInfo($caisse);
            }

            DB::commit();
            $this->dashboardCache->invalidate($ownerId);

            return response()->json([
                'success' => true,
                'message' => 'Acompte enregistré avec succès',
                'acompte' => $acompte->load('employe'),
                'nouveau_solde' => $client->fresh()->solde_dette,
                'caisse' => $caisseInfo,
            ], 201);
        } catch (\Throwable $exception) {
            DB::rollBack();
            throw $exception;
        }
    }
}
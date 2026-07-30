<?php

namespace App\Http\Controllers;

use App\Models\FideliteSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FideliteSettingController extends Controller
{
    use RoleHelper;

    /**
     * GET /api/fidelite/config
     */
    public function show(): JsonResponse
    {
        $ownerId = $this->getOwnerId();
        $config  = FideliteSetting::where('utilisateur_id', $ownerId)->first();

        return response()->json([
            'success' => true,
            'config'  => $config ?? [
                'utilisateur_id'  => $ownerId,
                'montant_tranche' => 0,
                'points_accordes' => 0,
            ],
        ]);
    }

    /**
     * PUT /api/fidelite/config  (patron et admin uniquement)
     */
    public function update(Request $request): JsonResponse
    {
        if (!$this->isPatron() && !$this->isEmployeeAdmin()) {
            return $this->accessDeniedResponse('Seul le propriétaire ou un admin peut modifier la règle de fidélité');
        }

        $validated = $request->validate([
            'montant_tranche' => 'required|integer|min:1',
            'points_accordes' => 'required|integer|min:1',
        ]);

        $ownerId = $this->getOwnerId();

        $config = FideliteSetting::updateOrCreate(
            ['utilisateur_id' => $ownerId],
            [
                'montant_tranche' => $validated['montant_tranche'],
                'points_accordes' => $validated['points_accordes'],
                'updated_by'      => $ownerId,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Règle de fidélité mise à jour avec succès',
            'config'  => $config,
        ]);
    }
}
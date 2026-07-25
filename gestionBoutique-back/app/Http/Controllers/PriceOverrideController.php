<?php

namespace App\Http\Controllers;

use App\Models\PriceOverride;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PriceOverrideController extends Controller
{
    use RoleHelper;

    /**
     * Liste des surcharges de prix, filtrable par employé/produit/période.
     * GET /api/price-overrides
     */
    public function index(Request $request): JsonResponse
    {
        if (!$this->canManageDepenses()) {
            return $this->accessDeniedResponse('Seul le patron ou l\'employé admin peut consulter l\'historique des ajustements de prix.');
        }

        $ownerId = $this->getOwnerId();

        $query = PriceOverride::with(['product', 'employe', 'vente'])
            ->whereHas('vente', function ($q) use ($ownerId) {
                $q->where('utilisateur_id', $ownerId);
            })
            ->orderBy('created_at', 'desc');

        if ($request->filled('employe_id')) {
            $query->where('employe_id', $request->employe_id);
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('created_at', [
                $request->start_date . ' 00:00:00',
                $request->end_date . ' 23:59:59',
            ]);
        }

        $overrides = $query->paginate(20);

        return response()->json([
            'success'         => true,
            'price_overrides' => $overrides,
        ]);
    }
}
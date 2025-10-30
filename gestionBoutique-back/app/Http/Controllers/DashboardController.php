<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    use RoleHelper;

    /**
     * Retourne les statistiques du tableau de bord
     */
    public function getStats(): JsonResponse
    {
        // Récupérer l'utilisateur connecté
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }

        // Déterminer le propriétaire réel (patron)
        $ownerId = $this->getOwnerId();

        if (!$ownerId) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de déterminer le propriétaire du compte'
            ], 400);
        }

        try {
            $now = Carbon::now();
            $products = Product::where('utilisateur_id', $ownerId)->get();

            // --- Calcul des statistiques principales ---
            $totalProducts = $products->count();
            $totalValue = $products->sum(fn($product) => $product->price * $product->stock);
            $lowStockProducts = $products->filter(fn($p) => $p->stock <= $p->min_stock)->count();

            // --- Exemple d’historique des ventes simulé (à remplacer par des vraies données) ---
            $salesHistory = collect(range(0, 6))->map(fn($days) => [
                'date' => $now->copy()->subDays($days)->format('Y-m-d'),
                'amount' => rand(1000, 5000),
            ])->reverse()->values();

            // --- Alerte de stock ---
            $stockAlerts = $products->filter(fn($p) => $p->stock <= $p->min_stock)
                ->map(fn($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'stock' => $p->stock,
                    'minStock' => $p->min_stock,
                ])->values();

            return response()->json([
                'success' => true,
                'totalProducts' => $totalProducts,
                'lowStockProducts' => $lowStockProducts,
                'totalValue' => $totalValue,
                'stockMovements' => rand(10, 50), // à remplacer plus tard
                'salesHistory' => $salesHistory,
                'stockAlerts' => $stockAlerts,
                'debug' => [
                    'user_type' => get_class($user) === 'App\Models\Employe' ? 'employe' : 'patron',
                    'owner_id' => $ownerId,
                    'user_id' => $user->id,
                    'products_count' => $products->count(),
                    'is_employe' => get_class($user) === 'App\Models\Employe',
                    'is_patron' => get_class($user) === 'App\Models\Utilisateur',
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur dans DashboardController@getStats : ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

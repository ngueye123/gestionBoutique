<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
class DashboardController extends Controller
{
    public function getStats(): JsonResponse
    {
        $now = Carbon::now();
        $products = Product::where('utilisateur_id', Auth::id())->get();

        
        // Calculer les statistiques
        $totalProducts = $products->count();
        $totalValue = $products->sum(function ($product) {
            return $product->price * $product->stock;
        });
        
        $lowStockProducts = $products->filter(function ($product) {
            return $product->stock <= $product->min_stock;
        })->count();

        // Simuler l'historique des ventes (à remplacer par de vraies données)
        $salesHistory = collect(range(0, 6))->map(function ($days) use ($now) {
            return [
                'date' => $now->copy()->subDays($days)->format('Y-m-d'),
                'amount' => rand(1000, 5000)
            ];
        })->reverse()->values();

        // Récupérer les alertes de stock
        $stockAlerts = $products
            ->filter(function ($product) {
                return $product->stock <= $product->min_stock;
            })
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'stock' => $product->stock,
                    'minStock' => $product->min_stock
                ];
            })
            ->values();

        return response()->json([
            'totalProducts' => $totalProducts,
            'lowStockProducts' => $lowStockProducts,
            'totalValue' => $totalValue,
            'stockMovements' => rand(10, 50), // À remplacer par de vraies données
            'salesHistory' => $salesHistory,
            'stockAlerts' => $stockAlerts
        ]);
    }
}
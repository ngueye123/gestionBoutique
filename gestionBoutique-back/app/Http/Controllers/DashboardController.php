<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Vente;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use RoleHelper;

    public function getStats(): JsonResponse
    {
        $ownerId = $this->getOwnerId();

        if (!$ownerId) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de déterminer le propriétaire'
            ], 400);
        }

        try {
            $now = Carbon::now();
            
            // Récupérer les produits
            $products = Product::where('utilisateur_id', $ownerId)->get();

            // --- STATISTIQUES PRODUITS ---
            $totalProducts = $products->count();
            $totalValue = $products->sum(fn($product) => $product->price * $product->stock);
            $lowStockProducts = $products->filter(fn($p) => $p->stock <= $p->min_stock)->count();

            // --- HISTORIQUE DES VENTES (7 DERNIERS JOURS) ---
            $salesHistory = DB::table('ventes')
                ->select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('SUM(total) as amount')
                )
                ->where('utilisateur_id', $ownerId)
                ->where('created_at', '>=', $now->copy()->subDays(6)->startOfDay())
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('date', 'desc')
                ->get();

            // Remplir les jours manquants avec 0
            $salesHistoryComplete = collect(range(0, 6))->map(function ($days) use ($now, $salesHistory) {
                $date = $now->copy()->subDays(6 - $days)->format('Y-m-d');
                $sale = $salesHistory->firstWhere('date', $date);
                
                return [
                    'date' => $date,
                    'amount' => $sale ? (float) $sale->amount : 0
                ];
            });

            // --- VENTES MENSUELLES (12 DERNIERS MOIS) ---
            $monthlySales = DB::table('ventes')
                ->select(
                    DB::raw('DATE_FORMAT(created_at, "%Y-%m") as mois'),
                    DB::raw('COUNT(*) as nombre_ventes'),
                    DB::raw('SUM(total) as chiffre_affaires')
                )
                ->where('utilisateur_id', $ownerId)
                ->where('created_at', '>=', $now->copy()->subMonths(11)->startOfMonth())
                ->groupBy(DB::raw('DATE_FORMAT(created_at, "%Y-%m")'))
                ->orderBy('mois', 'asc')
                ->get();

            // --- MOUVEMENTS DE STOCK (NOMBRE DE VENTES DU JOUR) ---
            $stockMovements = Vente::where('utilisateur_id', $ownerId)
                ->whereDate('created_at', today())
                ->count();

            // --- ALERTES DE STOCK ---
            $stockAlerts = $products
                ->filter(fn($p) => $p->stock <= $p->min_stock)
                ->map(fn($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'stock' => $p->stock,
                    'minStock' => $p->min_stock
                ])->values();

            // --- STATISTIQUES SUPPLÉMENTAIRES ---
            $todaySales = Vente::where('utilisateur_id', $ownerId)
                ->whereDate('created_at', today())
                ->sum('total');

            $monthSales = Vente::where('utilisateur_id', $ownerId)
                ->whereMonth('created_at', $now->month)
                ->whereYear('created_at', $now->year)
                ->sum('total');

            return response()->json([
                'success' => true,
                'totalProducts' => $totalProducts,
                'lowStockProducts' => $lowStockProducts,
                'totalValue' => $totalValue,
                'stockMovements' => $stockMovements,
                'salesHistory' => $salesHistoryComplete,
                'monthlySales' => $monthlySales,
                'stockAlerts' => $stockAlerts,
                'todaySales' => (float) $todaySales,
                'monthSales' => (float) $monthSales,
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur dans DashboardController: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
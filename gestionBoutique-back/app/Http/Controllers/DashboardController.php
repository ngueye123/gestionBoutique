<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Vente;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use RoleHelper;

    /**
     * Retourne les statistiques du tableau de bord
     * GET /api/dashboard/stats?period=7days|month|custom&start_date=Y-m-d&end_date=Y-m-d
     */
    public function getStats(Request $request): JsonResponse
    {
        $ownerId = $this->getOwnerId();

        if (!$ownerId) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de déterminer le propriétaire'
            ], 400);
        }

        if (!$this->canViewDashboard()) {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'avez pas accès aux statistiques du tableau de bord'
            ], 403);
        }

        try {
            $now = Carbon::now();
            $period = $request->input('period', '7days'); // 7days, month, last_month, custom
            
            // Déterminer les dates de début et fin selon la période
            [$startDate, $endDate] = $this->getPeriodDates($period, $request, $now);

            // Récupérer les produits
            $products = Product::where('utilisateur_id', $ownerId)->get();

            // --- STATISTIQUES PRODUITS ---
            $totalProducts = $products->count();
            $totalValue = $products->sum(fn($product) => $product->price * $product->stock);
            $lowStockProducts = $products->filter(fn($p) => $p->stock <= $p->min_stock)->count();

            // --- STATISTIQUES DE VENTES POUR LA PÉRIODE ---
            $periodSales = $this->getSalesByPeriod($ownerId, $startDate, $endDate, $period);
            
            // --- VENTES MENSUELLES (12 DERNIERS MOIS) ---
            $monthlySales = $this->getMonthlySales($ownerId, $now);

            // --- STATISTIQUES TEMPS RÉEL ---
            $todaySales = Vente::where('utilisateur_id', $ownerId)
                ->whereDate('created_at', today())
                ->sum('total');

            $monthSales = Vente::where('utilisateur_id', $ownerId)
                ->whereMonth('created_at', $now->month)
                ->whereYear('created_at', $now->year)
                ->sum('total');

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

            // --- TOP PRODUITS VENDUS ---
            $topProducts = $this->getTopProducts($ownerId, $startDate, $endDate);
            // Calcul du bénéfice sur la même période
            $beneficePeriode = $this->getBeneficePeriode($ownerId, $startDate, $endDate);

            return response()->json([
                'success' => true,
                'totalProducts' => $totalProducts,
                'lowStockProducts' => $lowStockProducts,
                'totalValue' => $totalValue,
                'stockMovements' => $stockMovements,
                'salesHistory' => $periodSales['history'],
                'periodTotal' => $periodSales['total'],
                'periodCount' => $periodSales['count'],
                'monthlySales' => $monthlySales,
                'stockAlerts' => $stockAlerts,
                'todaySales' => (float) $todaySales,
                'monthSales' => (float) $monthSales,
                'topProducts' => $topProducts,
                'depenses_periode' => $beneficePeriode['total_depenses'],
                'benefice_periode' => $beneficePeriode['benefice'],
                'depenses_history' => $beneficePeriode['history'],
                'period' => [
                    'type' => $period,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                    'label' => $this->getPeriodLabel($period, $startDate, $endDate)
                ]
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

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/depenses/resume
    // Utilisé par le DashboardController pour calculer le bénéfice.
    // Paramètres obligatoires : start_date, end_date (YYYY-MM-DD)
    // ─────────────────────────────────────────────────────────────────────────

    public function resume(Request $request): JsonResponse
    {
        $patron = $this->assertPatron();

        $request->validate([
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
        ]);

        $debut = $request->start_date;
        $fin   = $request->end_date;

        // Total des dépenses sur la plage
        $total = (float) Depense::byUtilisateur($patron->id)
            ->parPeriode($debut, $fin)
            ->sum('montant');

        // Détail jour par jour (même structure que salesHistory du dashboard)
        $parJour = Depense::byUtilisateur($patron->id)
            ->parPeriode($debut, $fin)
            ->select(
                DB::raw('DATE(date_depense) as date'),
                DB::raw('SUM(montant) as montant'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy(DB::raw('DATE(date_depense)'))
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        // Remplir tous les jours de la plage avec 0 si aucune dépense
        $history  = [];
        $cursor   = \Carbon\Carbon::parse($debut);
        $dateFin  = \Carbon\Carbon::parse($fin);

        while ($cursor->lte($dateFin)) {
            $dateStr   = $cursor->format('Y-m-d');
            $row       = $parJour->get($dateStr);
            $history[] = [
                'date'    => $dateStr,
                'montant' => $row ? (float) $row->montant : 0.0,
                'count'   => $row ? (int)   $row->count   : 0,
            ];
            $cursor->addDay();
        }

        return response()->json([
            'success' => true,
            'total'   => $total,
            'history' => $history,
            'periode' => ['start_date' => $debut, 'end_date' => $fin],
        ]);
    }

    /**
     * Détermine les dates de début et fin selon la période
     */
    private function getPeriodDates(string $period, Request $request, Carbon $now): array
    {
        switch ($period) {
            case '7days':
                return [
                    $now->copy()->subDays(6)->startOfDay(),
                    $now->copy()->endOfDay()
                ];
            
            case 'month':
                return [
                    $now->copy()->startOfMonth(),
                    $now->copy()->endOfMonth()
                ];
            
            case 'last_month':
                return [
                    $now->copy()->subMonth()->startOfMonth(),
                    $now->copy()->subMonth()->endOfMonth()
                ];
            
            case 'custom':
                $startDate = $request->input('start_date') 
                    ? Carbon::parse($request->input('start_date'))->startOfDay()
                    : $now->copy()->subDays(6)->startOfDay();
                
                $endDate = $request->input('end_date')
                    ? Carbon::parse($request->input('end_date'))->endOfDay()
                    : $now->copy()->endOfDay();
                
                return [$startDate, $endDate];
            
            default:
                return [
                    $now->copy()->subDays(6)->startOfDay(),
                    $now->copy()->endOfDay()
                ];
        }
    }

    /**
     * Récupère les ventes par période
     */
    private function getSalesByPeriod(int $ownerId, Carbon $startDate, Carbon $endDate, string $period): array
    {
        $sales = DB::table('ventes')
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total) as amount'),
                DB::raw('COUNT(*) as count')
            )
            ->where('utilisateur_id', $ownerId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date', 'desc')
            ->get();

        // Créer un tableau complet de toutes les dates de la période
        $history = [];
        $currentDate = $startDate->copy();
        
        while ($currentDate <= $endDate) {
            $dateStr = $currentDate->format('Y-m-d');
            $sale = $sales->firstWhere('date', $dateStr);
            
            $history[] = [
                'date' => $dateStr,
                'amount' => $sale ? (float) $sale->amount : 0,
                'count' => $sale ? (int) $sale->count : 0
            ];
            
            $currentDate->addDay();
        }
        $history = array_reverse($history);

        $total = array_sum(array_column($history, 'amount'));
        $count = array_sum(array_column($history, 'count'));

        return [
            'history' => $history,
            'total' => $total,
            'count' => $count
        ];
    }

    /**
     * Récupère les ventes mensuelles (12 derniers mois)
     */
    private function getMonthlySales(int $ownerId, Carbon $now): array
    {
        $monthlySales = DB::table('ventes')
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as mois'),
                DB::raw('COUNT(*) as nombre_ventes'),
                DB::raw('SUM(total) as chiffre_affaires')
            )
            ->where('utilisateur_id', $ownerId)
            ->where('created_at', '>=', $now->copy()->subMonths(11)->startOfMonth())
            ->groupBy(DB::raw('DATE_FORMAT(created_at, "%Y-%m")'))
            ->orderBy('mois', 'desc')
            ->get();

        return $monthlySales->map(function($sale) {
            return [
                'mois' => $sale->mois,
                'nombre_ventes' => (int) $sale->nombre_ventes,
                'chiffre_affaires' => (float) $sale->chiffre_affaires
            ];
        })->toArray();
    }

    /**
     * Récupère les produits les plus vendus
     */
    private function getTopProducts(int $ownerId, Carbon $startDate, Carbon $endDate): array
    {
        $topProducts = DB::table('ventes_details')
            ->join('ventes', 'ventes_details.vente_id', '=', 'ventes.id')
            ->select(
                'ventes_details.nom_produit',
                DB::raw('SUM(ventes_details.quantite) as total_quantite'),
                DB::raw('SUM(ventes_details.sous_total) as total_ventes')
            )
            ->where('ventes.utilisateur_id', $ownerId)
            ->whereBetween('ventes.created_at', [$startDate, $endDate])
            ->groupBy('ventes_details.nom_produit')
            ->orderBy('total_quantite', 'desc')
            ->limit(5)
            ->get();

        return $topProducts->map(function($product) {
            return [
                'nom' => $product->nom_produit,
                'quantite' => (int) $product->total_quantite,
                'ventes' => (float) $product->total_ventes
            ];
        })->toArray();
    }

    /**
     * Génère un libellé pour la période
     */
    private function getPeriodLabel(string $period, Carbon $startDate, Carbon $endDate): string
    {
        switch ($period) {
            case '7days':
                return '7 derniers jours';
            case 'month':
                return $startDate->locale('fr')->isoFormat('MMMM YYYY');
            case 'last_month':
                return $startDate->locale('fr')->isoFormat('MMMM YYYY');
            case 'custom':
                return $startDate->format('d/m/Y') . ' - ' . $endDate->format('d/m/Y');
            default:
                return '7 derniers jours';
        }
    }

    /**
     * Calcule les dépenses et le bénéfice sur une période donnée.
     * Bénéfice = chiffre d'affaires de la période − dépenses de la période.
     * Utilise date_depense (colonne du modèle Depense) et non created_at.
     *
     * @return array{total_depenses: float, benefice: float, history: array}
     */
    private function getBeneficePeriode(int $ownerId, Carbon $startDate, Carbon $endDate): array
    {
        $debutStr = $startDate->format('Y-m-d');
        $finStr   = $endDate->format('Y-m-d');

        // Total des dépenses sur la période
        $totalDepenses = (float) DB::table('depenses')
            ->where('utilisateur_id', $ownerId)
            ->whereBetween('date_depense', [$debutStr, $finStr])
            ->sum('montant');

        // Chiffre d'affaires sur la même période (déjà calculé dans getSalesByPeriod
        // mais on recalcule ici pour rester indépendant)
        $chiffreAffaires = (float) DB::table('ventes')
            ->where('utilisateur_id', $ownerId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total');

        // Dépenses par jour pour le tableau comparatif jour par jour
        $depensesParJour = DB::table('depenses')
            ->select(
                DB::raw('DATE(date_depense) as date'),
                DB::raw('SUM(montant) as montant')
            )
            ->where('utilisateur_id', $ownerId)
            ->whereBetween('date_depense', [$debutStr, $finStr])
            ->groupBy(DB::raw('DATE(date_depense)'))
            ->get()
            ->keyBy('date');

        // Tableau jour par jour aligné sur la période du dashboard
        $history = [];
        $cursor  = $startDate->copy();

        while ($cursor->lte($endDate)) {
            $dateStr   = $cursor->format('Y-m-d');
            $row       = $depensesParJour->get($dateStr);
            $history[] = [
                'date'    => $dateStr,
                'montant' => $row ? (float) $row->montant : 0.0,
            ];
            $cursor->addDay();
        }

        return [
            'total_depenses' => $totalDepenses,
            'benefice'       => $chiffreAffaires - $totalDepenses,
            'history'        => $history,
        ];
    }
}
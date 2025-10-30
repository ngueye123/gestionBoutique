<?php

namespace App\Http\Controllers;

use App\Models\Vente;
use App\Models\VenteDetail;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class VenteController extends Controller
{
    use RoleHelper;

    /**
     * Enregistrer une nouvelle vente
     * POST /api/ventes
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'moyen_paiement' => 'required|in:especes,wave,orange_money,carte',
            'montant_recu' => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $ownerId = $this->getOwnerId();
            $user = Auth::user();
            $employeId = get_class($user) === 'App\Models\Employe' ? $user->id : null;

            // Calculer le total et vérifier le stock
            $total = 0;
            $venteItems = [];

            foreach ($validated['items'] as $item) {
                $product = Product::where('id', $item['id'])
                    ->where('utilisateur_id', $ownerId)
                    ->first();

                if (!$product) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Produit introuvable: ' . $item['id']
                    ], 404);
                }

                if ($product->stock < $item['quantity']) {
                    return response()->json([
                        'success' => false,
                        'message' => "Stock insuffisant pour {$product->name}. Disponible: {$product->stock}"
                    ], 400);
                }

                $sousTotal = $product->price * $item['quantity'];
                $total += $sousTotal;

                $venteItems[] = [
                    'product' => $product,
                    'quantity' => $item['quantity'],
                    'sous_total' => $sousTotal,
                ];
            }

            // Vérifier le montant reçu pour paiement en espèces
            if ($validated['moyen_paiement'] === 'especes') {
                if (!isset($validated['montant_recu']) || $validated['montant_recu'] < $total) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Montant reçu insuffisant'
                    ], 400);
                }
            }

            // Créer la vente
            $vente = Vente::create([
                'reference' => Vente::generateReference(),
                'utilisateur_id' => $ownerId,
                'employe_id' => $employeId,
                'total' => $total,
                'moyen_paiement' => $validated['moyen_paiement'],
                'montant_recu' => $validated['montant_recu'] ?? $total,
                'monnaie' => isset($validated['montant_recu']) ? $validated['montant_recu'] - $total : 0,
            ]);

            // Créer les détails et mettre à jour les stocks
            foreach ($venteItems as $venteItem) {
                $product = $venteItem['product'];

                // Créer le détail de vente
                VenteDetail::create([
                    'vente_id' => $vente->id,
                    'product_id' => $product->id,
                    'reference_produit' => $product->reference,
                    'nom_produit' => $product->name,
                    'quantite' => $venteItem['quantity'],
                    'prix_unitaire' => $product->price,
                    'sous_total' => $venteItem['sous_total'],
                ]);

                // Mettre à jour le stock
                $product->decrement('stock', $venteItem['quantity']);
            }

            DB::commit();

            // Charger les détails pour la réponse
            $vente->load('details');

            return response()->json([
                'success' => true,
                'message' => 'Vente enregistrée avec succès',
                'vente' => $vente
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur lors de l\'enregistrement de la vente: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement de la vente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Liste des ventes
     * GET /api/ventes
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $ownerId = $this->getOwnerId();
            
            $query = Vente::with('details', 'employe')
                ->where('utilisateur_id', $ownerId)
                ->orderBy('created_at', 'desc');

            // Filtrer par date si fournie
            if ($request->has('date')) {
                $query->whereDate('created_at', $request->date);
            }

            // Filtrer par période si fournie
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->betweenDates($request->start_date, $request->end_date);
            }

            $ventes = $query->paginate(20);

            return response()->json([
                'success' => true,
                'ventes' => $ventes
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des ventes: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des ventes'
            ], 500);
        }
    }

    /**
     * Détails d'une vente
     * GET /api/ventes/{id}
     */
    public function show(int $id): JsonResponse
    {
        try {
            $ownerId = $this->getOwnerId();
            
            $vente = Vente::with('details', 'employe')
                ->where('utilisateur_id', $ownerId)
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'vente' => $vente
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Vente introuvable'
            ], 404);
        }
    }
}
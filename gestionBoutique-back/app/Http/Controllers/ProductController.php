<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use App\Services\DashboardCacheService;
class ProductController extends Controller
{
    
    use RoleHelper;
    public function __construct(private readonly DashboardCacheService $dashboardCache) {}

    /**
     * Afficher la liste des produits
     */
    public function index(): JsonResponse
    {
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }

        if (!$this->canViewProducts()) {
            return $this->accessDeniedResponse('Vous n\'avez pas accès à la liste des produits');
        }

        // Déterminer l'ID du patron propriétaire
        $ownerId = $this->getOwnerId();
        $products = Product::where('utilisateur_id', $ownerId)->get();

        return response()->json([
            'success' => true,
            'products' => $products,
        ]);
    }

    /**
     * Ajouter un produit
     */
    public function store(Request $request): JsonResponse
    {
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }

        if (!$this->canManageProducts()) {
            return $this->accessDeniedResponse('Seuls les patrons et employés admin ou vendeur peuvent ajouter des produits');
        }

        $validated = $request->validate([
            'reference' => 'required|string',
            'name' => 'required|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'category' => 'required|string',
            'min_stock' => 'nullable|integer|min:0',
        ]);

        $ownerId = $this->getOwnerId();

        if (Product::where('reference', $validated['reference'])
            ->where('utilisateur_id', $ownerId)
            ->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'La référence du produit existe déjà pour ce patron'
            ], 400);
        }

        $validated['utilisateur_id'] = $ownerId;
        $product = Product::create($validated);
        $this->dashboardCache->invalidate($ownerId);
        return response()->json([
            'success' => true,
            'message' => 'Produit ajouté avec succès',
            'product' => $product
        ], 201);
    }

    /**
     * Modifier un produit
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }

        if (!$this->canManageProducts()) {
            return $this->accessDeniedResponse('Seuls les patrons et employés admin ou vendeur peuvent modifier des produits');
        }

        $ownerId = $this->getOwnerId();
        $product = Product::where('id', $id)
            ->where('utilisateur_id', $ownerId)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Produit non trouvé pour ce patron'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'category' => 'required|string',
            'min_stock' => 'nullable|integer|min:0'
        ]);

        $product->update($validated);
        $this->dashboardCache->invalidate($ownerId);
        return response()->json([
            'success' => true,
            'message' => 'Produit mis à jour avec succès',
            'product' => $product->fresh(),
        ]);
    }

    /**
     * Mettre à jour le stock
     */
    public function updateStock(Request $request, int $id): JsonResponse
    {
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }

        if (!$this->canViewProducts()) {
            return $this->accessDeniedResponse('Accès refusé');
        }

        $validated = $request->validate([
            'quantity' => 'required|integer'
        ]);

        $ownerId = $this->getOwnerId();
        $product = Product::where('id', $id)
            ->where('utilisateur_id', $ownerId)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Produit non trouvé'
            ], 404);
        }

        $newStock = max(0, $product->stock - $validated['quantity']);
        $product->update(['stock' => $newStock]);

        return response()->json([
            'success' => true,
            'product' => $product
        ]);
    }

    /**
     * Supprimer un produit
     */
    public function destroy(int $id): JsonResponse
    {
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }

        if (!$this->canManageProducts()) {
            return $this->accessDeniedResponse('Seuls les patrons et employés admin ou vendeur peuvent supprimer des produits');
        }

        $ownerId = $this->getOwnerId();
        $product = Product::where('id', $id)
            ->where('utilisateur_id', $ownerId)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Produit non trouvé pour ce patron'
            ], 404);
        }

        $product->delete();
        $this->dashboardCache->invalidate($ownerId);
        return response()->json([
            'success' => true,
            'message' => 'Produit supprimé avec succès'
        ]);
    }
}

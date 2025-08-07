<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    use RoleHelper;

    public function index(): JsonResponse
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }

        if (!$this->canViewProducts()) {
            return $this->accessDeniedResponse('Vous n\'avez pas accès à la liste des produits');
        }

        $ownerId = $this->getOwnerId();
        if (!$ownerId) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de déterminer le propriétaire'
            ], 400);
        }

        $products = Product::where('utilisateur_id', $ownerId)->get();

        return response()->json([
            'success' => true,
            'products' => $products
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }

        if (!$this->canManageProducts()) {
            return $this->accessDeniedResponse('Seuls les patrons et employés admin peuvent ajouter des produits');
        }

        $validated = $request->validate([
            'reference' => 'required',
            'name' => 'required',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'category' => 'required',
            'min_stock' => 'nullable|integer|min:0',
        ]);

        $ownerId = $this->getOwnerId();
        
        if (Product::where('reference', $validated['reference'])
            ->where('utilisateur_id', $ownerId)
            ->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'La référence du produit existe déjà'
            ], 400);
        }

        try {
            $validated['utilisateur_id'] = $ownerId;
            $product = Product::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Produit ajouté avec succès',
                'product' => $product
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du produit : ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (!$this->canManageProducts()) {
            return $this->accessDeniedResponse('Seuls les patrons et employés admin peuvent modifier des produits');
        }

        $ownerId = $this->getOwnerId();
        $product = Product::where('id', $id)
            ->where('utilisateur_id', $ownerId)
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Produit non trouvé'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'category' => 'required|string',
            'min_stock' => 'nullable|integer|min:0'
        ]);

        $product->update($validated);
        return response()->json([
            'success' => true,
            'message' => 'Produit mis à jour avec succès',
            'product' => $product->fresh(),
        ], 200);
    }

    public function updateStock(Request $request, int $id): JsonResponse
    {
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
            return response()->json(['message' => 'Produit non trouvé'], 404);
        }

        $newStock = max(0, $product->stock - $validated['quantity']);
        $product->update(['stock' => $newStock]);

        return response()->json([
            'success' => true,
            'product' => $product
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        if (!$this->canManageProducts()) {
            return $this->accessDeniedResponse('Seuls les patrons et employés admin peuvent supprimer des produits');
        }

        try {
            $ownerId = $this->getOwnerId();
            $product = Product::where('id', $id)
                ->where('utilisateur_id', $ownerId)
                ->first();

            if (!$product) {
                return response()->json(['message' => 'Produit non trouvé'], 404);
            }

            $product->delete();
            return response()->json([
                'success' => true,
                'message' => 'Produit supprimé avec succès'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la suppression du produit',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
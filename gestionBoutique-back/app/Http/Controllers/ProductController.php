<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }
        // Récupère les produits de l'utilisateur connecté
        $products = Product::where('utilisateur_id', $user->id)->get();

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

    $validated = $request->validate([
        'reference' => 'required',
        'name' => 'required',
        'price' => 'required|numeric|min:0',
        'stock' => 'required|integer|min:0',
        'category' => 'required',
        'min_stock' => 'nullable|integer|min:0',
    ]);

    $utilisateurId = Auth::id();

    if (Product::where('reference', $validated['reference'])
        ->where('utilisateur_id', $utilisateurId)
        ->exists()) {
        return response()->json([
            'success' => false,
            'message' => 'La référence du produit existe déjà pour cet utilisateur'
        ], 400);
    }

    try {
        $validated['utilisateur_id'] = $utilisateurId;
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
        // Trouver le produit qui appartient à l'utilisateur connecté
        $product = Product::where('id', $id)
            ->where('utilisateur_id', Auth::id()) // Vérifie que l'utilisateur est bien le propriétaire
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Produit non trouvé ou non autorisé'], 404);
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
        $validated = $request->validate([
            'quantity' => 'required|integer'
        ]);

        // Trouver le produit de l'utilisateur connecté
        $product = Product::where('id', $id)
            ->where('utilisateur_id', Auth::id())
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Produit non trouvé ou non autorisé'], 404);
        }

        $newStock = max(0, $product->stock - $validated['quantity']);
        $product->update(['stock' => $newStock]);

        return response()->json($product);
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $product = Product::where('id', $id)
                ->where('utilisateur_id', Auth::id())
                ->first();

            if (!$product) {
                return response()->json(['message' => 'Produit non trouvé ou non autorisé'], 404);
            }

            $product->delete();
            return response()->json(['message' => 'Produit supprimé avec succès'], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la suppression du produit',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

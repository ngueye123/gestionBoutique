<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
class ClientController extends Controller
{
    use RoleHelper;

    /**
     * Lister tous les clients
     * GET /api/clients?search=nom
     */
    public function index(Request $request): JsonResponse
    {
        
        $ownerId = $this->getOwnerId();
        
        $query = Client::byUtilisateur($ownerId)
            ->with(['remboursements' => function($q) {
                $q->latest()->take(5);
            }]);

        // Recherche par nom ou téléphone
        if ($request->has('search') && !empty($request->search)) {
            $query->search($request->search);
        }

        // Filtrer uniquement ceux avec dettes si demandé
        if ($request->boolean('avec_dettes')) {
            $query->avecDettes();
        }

        $clients = $query->orderBy('nom')->get();

        return response()->json([
            'success' => true,
            'clients' => $clients
        ]);

        
    }

    /**
     * Créer un nouveau client
     * POST /api/clients
     */

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom'       => 'required|string|max:255',
            'telephone' => 'required|string|max:20',
        ]); // ValidationException gérée globalement si échec → 422 automatique

        $ownerId = $this->getOwnerId();

        $existant = Client::byUtilisateur($ownerId)
            ->where('telephone', $validated['telephone'])
            ->first();

        if ($existant) {
            return response()->json([
                'success' => false,
                'message' => 'Un client avec ce numéro existe déjà',
                'client'  => $existant
            ], 409);
        }

        $client = Client::create([
            'nom'            => $validated['nom'],
            'telephone'      => $validated['telephone'],
            'utilisateur_id' => $ownerId,
            'solde_dette'    => 0
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Client créé avec succès',
            'client'  => $client
        ], 201);
    // Plus besoin de catch ValidationException ni \Exception générique
}
    /**
     * Afficher les détails d'un client
     * GET /api/clients/{id}
     */
    public function show(int $id): JsonResponse
    {
        $ownerId = $this->getOwnerId();

        $client = Client::byUtilisateur($ownerId)
            ->with([
                'ventes' => function($q) {
                    $q->where('moyen_paiement', 'dette')->latest()->take(10);
                },
                'remboursements' => function($q) {
                    $q->latest()->take(10);
                }
            ])
            ->findOrFail($id); // lève ModelNotFoundException si absent → géré globalement

        return response()->json([
            'success' => true,
            'client'  => $client
        ]);
    }

    /**
     * Mettre à jour un client
     * PUT /api/clients/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'telephone' => 'required|string|max:20',
        ]);

        $ownerId = $this->getOwnerId();
        
        $client = Client::byUtilisateur($ownerId)->findOrFail($id);

        // Vérifier si le nouveau téléphone n'est pas déjà utilisé
        $existant = Client::byUtilisateur($ownerId)
            ->where('telephone', $validated['telephone'])
            ->where('id', '!=', $id)
            ->first();

        if ($existant) {
            return response()->json([
                'success' => false,
                'message' => 'Ce numéro de téléphone est déjà utilisé'
            ], 409);
        }

        $client->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Client mis à jour avec succès',
            'client' => $client
        ]);

        
    }

    /**
     * Supprimer un client (seulement si solde = 0)
     * DELETE /api/clients/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        if (!$this->canManageProducts()) {
            return $this->accessDeniedResponse('Permission insuffisante');
        }

        $ownerId = $this->getOwnerId();
        $client  = Client::byUtilisateur($ownerId)->findOrFail($id); // 404 auto si absent

        // Règle métier explicite — reste un if, pas une exception
        if ($client->aDette()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer un client avec des dettes en cours'
            ], 400);
        }

        $client->delete();

        return response()->json([
            'success' => true,
            'message' => 'Client supprimé avec succès'
        ]);
    }
    /**
     * Recherche rapide de clients (autocomplétion)
     * GET /api/clients/search?q=nom
     */
    public function search(Request $request): JsonResponse
    {
        
        $query = $request->input('q', '');
        
        if (strlen($query) < 2) {
            return response()->json([
                'success' => true,
                'clients' => []
            ]);
        }

        $ownerId = $this->getOwnerId();
        
        $clients = Client::byUtilisateur($ownerId)
            ->search($query)
            ->select('id', 'nom', 'telephone', 'solde_dette')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'clients' => $clients
        ]);

       
    }
}
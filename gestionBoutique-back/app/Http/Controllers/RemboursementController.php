<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Remboursement;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class RemboursementController extends Controller
{
    use RoleHelper;

    /**
     * Enregistrer un nouveau remboursement
     * POST /api/remboursements
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|integer|exists:clients,id',
            'montant' => 'required|numeric|min:0.01',
            'moyen_paiement' => 'required|in:especes,wave,orange_money,carte',
            'note' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            $ownerId = $this->getOwnerId();
            $user = Auth::user();
            $employeId = get_class($user) === 'App\Models\Employe' ? $user->id : null;

            // Récupérer le client
            $client = Client::byUtilisateur($ownerId)->findOrFail($validated['client_id']);

            // Vérifier que le montant n'excède pas la dette
            if ($validated['montant'] > $client->solde_dette) {
                return response()->json([
                    'success' => false,
                    'message' => "Le montant ne peut pas dépasser la dette actuelle ({$client->solde_dette} €)"
                ], 400);
            }

            // Créer le remboursement
            $remboursement = Remboursement::create([
                'client_id' => $client->id,
                'utilisateur_id' => $ownerId,
                'employe_id' => $employeId,
                'montant' => $validated['montant'],
                'moyen_paiement' => $validated['moyen_paiement'],
                'note' => $validated['note'] ?? null,
            ]);

            // Mettre à jour le solde du client
            $client->reduireDette($validated['montant']);

            DB::commit();

            // Charger les relations pour la réponse
            $remboursement->load('client', 'employe');

            return response()->json([
                'success' => true,
                'message' => 'Remboursement enregistré avec succès',
                'remboursement' => $remboursement,
                'nouveau_solde' => $client->fresh()->solde_dette
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur enregistrement remboursement: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement du remboursement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Liste des remboursements
     * GET /api/remboursements?client_id=X
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $ownerId = $this->getOwnerId();
            
            $query = Remboursement::with('client', 'employe')
                ->byUtilisateur($ownerId)
                ->orderBy('created_at', 'desc');

            // Filtrer par client si spécifié
            if ($request->has('client_id')) {
                $query->where('client_id', $request->client_id);
            }

            // Filtrer par période si fournie
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->betweenDates($request->start_date, $request->end_date);
            }

            $remboursements = $query->paginate(20);

            return response()->json([
                'success' => true,
                'remboursements' => $remboursements
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur récupération remboursements: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des remboursements'
            ], 500);
        }
    }

    /**
     * Détails d'un remboursement
     * GET /api/remboursements/{id}
     */
    public function show(int $id): JsonResponse
    {
        try {
            $ownerId = $this->getOwnerId();
            
            $remboursement = Remboursement::with('client', 'employe')
                ->byUtilisateur($ownerId)
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'remboursement' => $remboursement
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Remboursement non trouvé'
            ], 404);
        }
    }

    /**
     * Historique des remboursements d'un client
     * GET /api/clients/{id}/remboursements
     */
    public function historiqueClient(int $clientId): JsonResponse
    {
        try {
            $ownerId = $this->getOwnerId();
            
            // Vérifier que le client appartient bien au patron
            $client = Client::byUtilisateur($ownerId)->findOrFail($clientId);
            
            $remboursements = Remboursement::with('employe')
                ->byClient($clientId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'client' => $client,
                'remboursements' => $remboursements,
                'total_rembourse' => $remboursements->sum('montant')
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur historique remboursements: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'historique'
            ], 500);
        }
    }
}
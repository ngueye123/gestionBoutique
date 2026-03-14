<?php

namespace App\Http\Controllers;

use App\Models\Vente;
use App\Models\VenteDetail;
use App\Models\Product;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\Caisse;
use App\Models\MouvementCaisse;
class VenteController extends Controller
{
    use RoleHelper;

    /**
     * Enregistrer une nouvelle vente (avec support des dettes)
     * POST /api/ventes
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items'           => 'required|array|min:1',
            'items.*.id'      => 'required|integer|exists:products,id',
            'items.*.quantity'=> 'required|integer|min:1',
            'moyen_paiement'  => 'required|in:especes,wave,orange_money,carte,dette',
            'montant_recu'    => 'nullable|numeric|min:0',
            'client_id'       => 'required_if:moyen_paiement,dette|nullable|integer|exists:clients,id',
        ]);

        DB::beginTransaction();

        try {
            $ownerId   = $this->getOwnerId();
            $user      = Auth::user();
            $employeId = get_class($user) === 'App\Models\Employe' ? $user->id : null;

            $total      = 0;
            $venteItems = [];

            foreach ($validated['items'] as $item) {
                $product = Product::where('id', $item['id'])
                    ->where('utilisateur_id', $ownerId)
                    ->first();

                if (!$product) {
                    return response()->json(['success' => false, 'message' => 'Produit introuvable: ' . $item['id']], 404);
                }

                if ($product->stock < $item['quantity']) {
                    return response()->json(['success' => false, 'message' => "Stock insuffisant pour {$product->name}. Disponible: {$product->stock}"], 400);
                }

                $sousTotal   = $product->price * $item['quantity'];
                $total      += $sousTotal;
                $venteItems[] = ['product' => $product, 'quantity' => $item['quantity'], 'sous_total' => $sousTotal];
            }

            if ($validated['moyen_paiement'] === 'especes') {
                if (!isset($validated['montant_recu']) || $validated['montant_recu'] < $total) {
                    return response()->json(['success' => false, 'message' => 'Montant reçu insuffisant'], 400);
                }
            }

            $clientId = null;
            $client   = null;
            if ($validated['moyen_paiement'] === 'dette') {
                if (!isset($validated['client_id'])) {
                    return response()->json(['success' => false, 'message' => 'Client requis pour une vente à crédit'], 400);
                }
                $client   = Client::byUtilisateur($ownerId)->findOrFail($validated['client_id']);
                $clientId = $client->id;
            }

            $vente = Vente::create([
                'reference'      => Vente::generateReference(),
                'utilisateur_id' => $ownerId,
                'employe_id'     => $employeId,
                'client_id'      => $clientId,
                'total'          => $total,
                'moyen_paiement' => $validated['moyen_paiement'],
                'montant_recu'   => $validated['montant_recu'] ?? $total,
                'monnaie'        => isset($validated['montant_recu']) ? $validated['montant_recu'] - $total : 0,
            ]);

            foreach ($venteItems as $venteItem) {
                $product = $venteItem['product'];
                VenteDetail::create([
                    'vente_id'         => $vente->id,
                    'product_id'       => $product->id,
                    'reference_produit'=> $product->reference,
                    'nom_produit'      => $product->name,
                    'quantite'         => $venteItem['quantity'],
                    'prix_unitaire'    => $product->price,
                    'sous_total'       => $venteItem['sous_total'],
                ]);
                $product->decrement('stock', $venteItem['quantity']);
            }

            if ($validated['moyen_paiement'] === 'dette' && $client) {
                $client->ajouterDette($total);
            }

            // ── ✅ NOUVEAU : Créditer la caisse si paiement espèces ──────────
            $caisseInfo = null;
            if ($validated['moyen_paiement'] === 'especes') {
                $caisse     = Caisse::pour($user);
                $mouvement  = $caisse->crediter($total, 'vente', $vente->id, "Vente {$vente->reference}");
                $caisse->refresh();

                $caisseInfo = [
                    'solde_actuel' => (float) $caisse->solde_actuel,
                    'plafond'      => (float) $caisse->plafond,
                    'pourcentage'  => $caisse->plafond > 0
                        ? round(($caisse->solde_actuel / $caisse->plafond) * 100, 1)
                        : 0,
                    'attention'    => $caisse->solde_actuel >= ($caisse->plafond * 0.8),
                ];
            }
            // ── Fin bloc caisse ──────────────────────────────────────────────

            DB::commit();

            $vente->load('details', 'client');

            return response()->json([
                'success'              => true,
                'message'              => 'Vente enregistrée avec succès',
                'vente'                => $vente,
                'nouveau_solde_client' => $client ? $client->fresh()->solde_dette : null,
                'caisse'               => $caisseInfo, // ← Infos caisse pour alerte frontend
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur lors de l\'enregistrement de la vente: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement de la vente',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
    /**
     * Liste des ventes
     * GET /api/ventes?client_id=X&type=credit
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $ownerId = $this->getOwnerId();
            
            $query = Vente::with('details', 'employe', 'client')
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

            // Filtrer par client si fourni
            if ($request->has('client_id')) {
                $query->where('client_id', $request->client_id);
            }

            // Filtrer par type (credit uniquement)
            if ($request->input('type') === 'credit') {
                $query->ventesCredit();
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
    public function show(String $ref): JsonResponse
    {
        try {
            $ownerId = $this->getOwnerId();
            
            $vente = Vente::with('details', 'employe', 'client')
                ->where('utilisateur_id', $ownerId)
                ->findOrFail($ref);

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
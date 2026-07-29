<?php

namespace App\Http\Controllers;

use App\Models\Vente;
use App\Models\VenteDetail;
use App\Models\Product;
use App\Models\Client;
use App\Models\Employe;
use App\Models\Utilisateur;
use APP\Models\SecuritySetting;
use App\Models\PriceOverride;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Caisse;
use App\Models\MouvementCaisse;
use App\Services\VenteService;
use App\Services\DashboardCacheService;

class VenteController extends Controller
{
    use RoleHelper;
    public function __construct(private readonly VenteService $venteService) {}
    /**
     * Résoudre l'acteur connecté (Employe ou Utilisateur/patron).
     * Même logique que CaisseController::getActor().
     */
    private function resolveActor(): Employe|Utilisateur
    {
        try {
            $employe = auth('employe')->user();
            if ($employe instanceof Employe) {
                return $employe;
            }
        } catch (\Exception $e) {}

        try {
            $utilisateur = auth('api')->user();
            if ($utilisateur instanceof Utilisateur) {
                return $utilisateur;
            }
        } catch (\Exception $e) {}

        abort(401, 'Non authentifié.');
    }

    /**
     * Enregistrer une nouvelle vente (avec support des dettes)
     * POST /api/ventes
     */
    public function store(Request $request): JsonResponse
    {
       $validated = $request->validate([
            'items'                              => 'required|array|min:1',
            'items.*.id'                         => 'required|integer|exists:products,id',
            'items.*.quantity'                   => 'required|numeric|min:0.001',
            'items.*.unite'                       => 'nullable|string|max:10',
            'items.*.prix_override'               => 'nullable|numeric|min:0',
            'items.*.justification'                => 'nullable|string|max:255',
            'items.*.pin'                           => 'nullable|string|max:10',

            'paiements'                              => 'required|array|min:1',
            'paiements.*.mode'                        => 'required|in:especes,wave,orange_money,dette',
            'paiements.*.montant'                      => 'required_unless:paiements.*.mode,especes|nullable|numeric|min:0.01',
            'paiements.*.montant_recu'                  => 'required_if:paiements.*.mode,especes|nullable|numeric|min:0.01',
            'paiements.*.reference_transaction'          => 'nullable|string|max:50',
            'paiements.*.client_id'                       => 'required_if:paiements.*.mode,dette|nullable|integer|exists:clients,id',
        ]);

        try {
            $actor  = $this->resolveActor();
            $result = $this->venteService->enregistrerVente($validated, $actor);

            return response()->json([
                'success'              => true,
                'message'              => 'Vente enregistrée avec succès',
                'vente'                => $result['vente'],
                'nouveau_solde_client' => $result['nouveau_solde_client'],
                'caisse'               => $result['caisse'],
            ], 201);

        } catch (\RuntimeException $e) {
            $code = (int) $e->getCode();
            $httpCode = ($code >= 100 && $code < 600) ? $code : 400;

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $httpCode);
        }
    }
        /**
     * Liste des ventes
     * GET /api/ventes?client_id=X&type=credit
     */
    public function index(Request $request): JsonResponse
    {
        $ownerId = $this->getOwnerId();

        $query = Vente::with('details', 'employe', 'client')
            ->where('utilisateur_id', $ownerId)
            ->orderBy('created_at', 'desc');

        if ($request->has('date')) {
            $query->whereDate('created_at', $request->date);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->betweenDates($request->start_date, $request->end_date);
        }

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->input('type') === 'credit') {
            $query->ventesCredit();
        }

        $ventes = $query->paginate(20);

        return response()->json([
            'success' => true,
            'ventes'  => $ventes,
        ]);
    }

    /**
     * Détails d'une vente
     * GET /api/ventes/{id}
     */
    public function show(string $ref): JsonResponse
    {
        $actor   = $this->resolveActor();
       $ownerId = $this->getOwnerId($actor);

        $vente = Vente::with('details', 'employe', 'client')
            ->where('utilisateur_id', $ownerId)  // isolation multi-tenant conservée
            ->where('reference', $ref)            // recherche par référence métier
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'vente'   => $vente,
        ]);
    }
}
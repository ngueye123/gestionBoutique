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
        'client_id'                              => 'nullable|integer|exists:clients,id',   // NEW
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
                'fidelite'             => $result['fidelite'],
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
        $actor   = $this->getAuthenticatedUser();
        $ownerId = $this->getOwnerId();

        $query = Vente::with('employe:id,nom,role', 'client:id,nom,telephone')
            ->where('utilisateur_id', $ownerId)
            ->orderBy('created_at', 'desc');

        // Restriction par rôle : vendeur/caissier ne voient que leurs propres ventes
        if ($actor instanceof Employe && in_array($actor->role, ['vendeur', 'caissier'])) {
            $query->where('employe_id', $actor->id);
        } elseif ($request->filled('employe_id')) {
            // Filtre employé — pertinent seulement pour patron/admin
            $query->where('employe_id', $request->employe_id);
        }

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

        if ($request->filled('moyen_paiement')) {
            $query->where('moyen_paiement', $request->moyen_paiement);
        }

        $ventes = $query->paginate($request->input('per_page', 20));

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
        $actor   = $this->getAuthenticatedUser();
        $ownerId = $this->getOwnerId();

        $query = Vente::with('details', 'employe', 'client')
            ->where('utilisateur_id', $ownerId)
            ->where('reference', $ref);

        // Un vendeur/caissier ne peut ouvrir que le détail de SES ventes
        if ($actor instanceof Employe && in_array($actor->role, ['vendeur', 'caissier'])) {
            $query->where('employe_id', $actor->id);
        }

        $vente = $query->firstOrFail();

        return response()->json([
            'success' => true,
            'vente'   => $vente,
        ]);
    }

    /**
     * Liste légère des employés du patron connecté, pour le filtre de l'historique.
     * GET /api/ventes/filtres/employes
     * Réservé patron/admin.
     */
    public function employesFiltre(): JsonResponse
    {
        $actor   = $this->getAuthenticatedUser();
        $isAdmin = $actor instanceof Employe && $actor->role === 'admin';

        if (!$this->isPatron() && !$isAdmin) {
            return $this->accessDeniedResponse('Seuls le patron et les employés admin peuvent filtrer par employé.');
        }

        $employes = Employe::where('utilisateur_id', $this->getOwnerId())
            ->orderBy('nom')
            ->get(['id', 'nom', 'role']);

        return response()->json([
            'success'  => true,
            'employes' => $employes,
        ]);
    }

}
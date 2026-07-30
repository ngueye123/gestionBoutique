<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UtilisateurController;
use App\Http\Controllers\EmployeController;
use App\Http\Controllers\EmployeAuthController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\VenteController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\RemboursementController;
use App\Http\Controllers\FactureController;
use App\Http\Controllers\CaisseController;
use App\Http\Middleware\CheckCaissePlafond;
use App\Http\Controllers\DepenseController;
use App\Http\Controllers\PinVerificationController;
use App\Http\Controllers\SecurityPinController;
use App\Http\Controllers\PriceOverrideController;
use App\Http\Controllers\FideliteSettingController;
use App\Http\Controllers\FideliteHistoriqueController;   

// ============================================================
// Routes publiques
// ============================================================
Route::post('/register', [UtilisateurController::class, 'register']);
Route::post('/login', [UtilisateurController::class, 'login'])-> middleware('throttle:5,1') ;
Route::post('/employe/login', [EmployeAuthController::class, 'login'])-> middleware('throttle:5,1') ;

// Email verification
Route::post('/verify-email', [UtilisateurController::class, 'verifyEmail']);
Route::post('/resend-verification', [UtilisateurController::class, 'resendVerification']);
Route::post('/employe/verify-email', [EmployeController::class, 'verifyEmail']);
// Password reset
Route::post('/forgot-password', [UtilisateurController::class, 'forgotPassword']);
Route::post('/reset-password', [UtilisateurController::class, 'resetPassword']);

// ============================================================
// Routes protégées avec JWT
// ============================================================
Route::middleware(['jwt.custom'])->group(function () {

    // ── Auth ─────────────────────────────────────────────────────────────
    Route::post('/logout', [UtilisateurController::class, 'logout']);
    Route::post('/employe/logout', [EmployeAuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::post('/employes/{id}/resend-verification', [EmployeController::class, 'resendVerification']);

    // ── Produits ──────────────────────────────────────────────────────────
    Route::prefix('products')->group(function () {
        Route::get('/', [ProductController::class, 'index']);
        Route::put('/{id}/update-stock', [ProductController::class, 'updateStock']);

        // Seulement patron et admin
        Route::post('/', [ProductController::class, 'store']);
        Route::put('/{id}', [ProductController::class, 'update']);
        Route::delete('/{id}', [ProductController::class, 'destroy']);
    });

    // ── Ventes ────────────────────────────────────────────────────────────
    Route::prefix('ventes')->group(function () {
        Route::get('/autocomplete', [FactureController::class, 'autocomplete']);
        Route::get('/search', [FactureController::class, 'searchByReference']);

        //  Classe complète au lieu de l'alias 'check.caisse'
        Route::post('/', [VenteController::class, 'store'])
            ->middleware(CheckCaissePlafond::class);

        Route::get('/', [VenteController::class, 'index']);
        Route::get('/{id}', [VenteController::class, 'show']);
        Route::get('/{id}/facture', [FactureController::class, 'generateFacture']);
        Route::get('/{id}/facture/preview', [FactureController::class, 'previewFacture']);
    });

    // ── Dashboard ─────────────────────────────────────────────────────────
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);

    // ── Employés ──────────────────────────────────────────────────────────
    Route::prefix('employes')->group(function () {
        Route::post('/', [EmployeController::class, 'store']);
        Route::get('/', [EmployeController::class, 'index']);
        Route::delete('/{id}', [EmployeController::class, 'destroy']);
        Route::put('/{id}/role', [EmployeController::class, 'updateRole']);
        Route::post('/{id}/resend-verification', [EmployeController::class, 'resendVerification']);
    });

    // ── Clients ───────────────────────────────────────────────────────────
    Route::prefix('clients')->group(function () {
        Route::get('/search', [ClientController::class, 'search']);
        Route::get('/', [ClientController::class, 'index']);
        Route::post('/', [ClientController::class, 'store']);
        Route::get('/{id}', [ClientController::class, 'show']);
        Route::put('/{id}', [ClientController::class, 'update']);
        Route::delete('/{id}', [ClientController::class, 'destroy']);
        Route::get('/{id}/remboursements', [RemboursementController::class, 'historiqueClient']);
    });

    // ── Remboursements ────────────────────────────────────────────────────
    Route::prefix('remboursements')->group(function () {
        // Classe complète au lieu de l'alias 'check.caisse'
        Route::post('/', [RemboursementController::class, 'store'])
            ->middleware(CheckCaissePlafond::class);

        Route::get('/', [RemboursementController::class, 'index']);
        Route::get('/{id}', [RemboursementController::class, 'show']);
    });

    // ── Caisse ────────────────────────────────────────────────────────────
    Route::prefix('caisse')->group(function () {
       // Ma caisse + historique mouvements (sans ventes)
        Route::get('/moi', [CaisseController::class, 'maCaisse']);
        // Apport ou prélèvement
        Route::post('/mouvement', [CaisseController::class, 'mouvement']);
        // Ticket PDF d'un prélèvement
        Route::get('/ticket/{mouvementId}', [CaisseController::class, 'ticket']);
        //  Bilan (POST — solde_reel obligatoire, sauvegarde + génère référence)
        Route::post('/bilan', [CaisseController::class, 'bilan']);
        //  Ticket PDF d'un bilan
        Route::get('/bilan/ticket/{bilanId}', [CaisseController::class, 'ticketBilan']);
        // Historique des bilans (patron uniquement)
        Route::get('/bilans', [CaisseController::class, 'historiqueBilans']);
        // Vue globale toutes caisses (patron/admin uniquement)
        Route::get('/toutes', [CaisseController::class, 'toutes']);
        //plafond-global AVANT /{id}/plafond
        Route::put('/plafond-global', [CaisseController::class, 'modifierPlafondGlobal']);
        Route::put('/{id}/plafond', [CaisseController::class, 'modifierPlafond']);

    });

    Route::prefix('depenses')->group(function () {
    Route::get('/resume',           [DepenseController::class, 'resume']);
    Route::get('/stats-annuelles',  [DepenseController::class, 'statsAnnuelles']);
    Route::get('/',                  [DepenseController::class, 'index']);
    Route::post('/',                 [DepenseController::class, 'store']);
    Route::put('/{id}',             [DepenseController::class, 'update']);
    Route::delete('/{id}',          [DepenseController::class, 'destroy']);
    });

    Route::get('/price-overrides', [PriceOverrideController::class, 'index']);
    Route::post('/pos/verify-pin', [PinVerificationController::class, 'verify'])-> middleware('throttle:5,1');
    Route::post('/security-pin', [SecurityPinController::class, 'create_pin'])-> middleware('throttle:5,1');

    // ── Fidélité ──────────────────────────────────────────────────────────
    Route::prefix('fidelite')->group(function () {
        Route::get('/config', [FideliteSettingController::class, 'show']);
        Route::put('/config', [FideliteSettingController::class, 'update']);
    });


    Route::get('/clients/{client}/fidelite-historique', [FideliteHistoriqueController::class, 'index']);
    Route::patch('/fidelite/historique/{id}', [FideliteHistoriqueController::class, 'toggleConsomme']);
});
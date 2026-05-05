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

// ✅ Import direct — contourne le problème d'alias 'check.caisse'
use App\Http\Middleware\CheckCaissePlafond;

// ============================================================
// Routes publiques
// ============================================================
Route::post('/register', [UtilisateurController::class, 'register']);
Route::post('/login', [UtilisateurController::class, 'login']);
Route::post('/employe/login', [EmployeAuthController::class, 'login']);

// Email verification
Route::post('/verify-email', [UtilisateurController::class, 'verifyEmail']);
Route::post('/resend-verification', [UtilisateurController::class, 'resendVerification']);

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

    // ── Produits ──────────────────────────────────────────────────────────
    Route::get('/products', [ProductController::class, 'index']);
    Route::put('/products/{id}/update-stock', [ProductController::class, 'updateStock']);

    // Seulement patron et admin
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // ── Ventes ────────────────────────────────────────────────────────────
    Route::get('/ventes/autocomplete', [FactureController::class, 'autocomplete']);
    Route::get('/ventes/search', [FactureController::class, 'searchByReference']);

    // ✅ Classe complète au lieu de l'alias 'check.caisse'
    Route::post('/ventes', [VenteController::class, 'store'])
        ->middleware(CheckCaissePlafond::class);

    Route::get('/ventes', [VenteController::class, 'index']);
    Route::get('/ventes/{id}', [VenteController::class, 'show']);

    // ── Factures ──────────────────────────────────────────────────────────
    Route::get('/ventes/{id}/facture', [FactureController::class, 'generateFacture']);
    Route::get('/ventes/{id}/facture/preview', [FactureController::class, 'previewFacture']);

    // ── Dashboard ─────────────────────────────────────────────────────────
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);

    // ── Employés ──────────────────────────────────────────────────────────
    Route::post('/employes', [EmployeController::class, 'store']);
    Route::get('/employes', [EmployeController::class, 'index']);
    Route::delete('/employes/{id}', [EmployeController::class, 'destroy']);
    Route::put('/employes/{id}/role', [EmployeController::class, 'updateRole']);

    // ── Clients ───────────────────────────────────────────────────────────
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::get('/clients/search', [ClientController::class, 'search']);
    Route::get('/clients/{id}', [ClientController::class, 'show']);
    Route::put('/clients/{id}', [ClientController::class, 'update']);
    Route::delete('/clients/{id}', [ClientController::class, 'destroy']);

    // ── Remboursements ────────────────────────────────────────────────────
    // ✅ Classe complète au lieu de l'alias 'check.caisse'
    Route::post('/remboursements', [RemboursementController::class, 'store'])
        ->middleware(CheckCaissePlafond::class);

    Route::get('/remboursements', [RemboursementController::class, 'index']);
    Route::get('/remboursements/{id}', [RemboursementController::class, 'show']);
    Route::get('/clients/{id}/remboursements', [RemboursementController::class, 'historiqueClient']);

    // ── Caisse ────────────────────────────────────────────────────────────
    Route::prefix('caisse')->group(function () {

       // Ma caisse + historique mouvements (sans ventes)
        Route::get('/moi', [CaisseController::class, 'maCaisse']);
 
        // Apport ou prélèvement
        Route::post('/mouvement', [CaisseController::class, 'mouvement']);
 
        // Ticket PDF d'un prélèvement
        Route::get('/ticket/{mouvementId}', [CaisseController::class, 'ticket']);
 
        // ✅ Bilan (POST — solde_reel obligatoire, sauvegarde + génère référence)
        // ⚠️  AVANT /bilan/{bilanId} pour éviter que Laravel interprète 'bilan' comme {bilanId}
        Route::post('/bilan', [CaisseController::class, 'bilan']);
 
        // ✅ Ticket PDF d'un bilan
        Route::get('/bilan/ticket/{bilanId}', [CaisseController::class, 'ticketBilan']);
 
        // ✅ Historique des bilans (patron uniquement)
        Route::get('/bilans', [CaisseController::class, 'historiqueBilans']);
 
        // Vue globale toutes caisses (patron/admin uniquement)
        Route::get('/toutes', [CaisseController::class, 'toutes']);
 
        // ⚠️ plafond-global AVANT /{id}/plafond
        Route::put('/plafond-global', [CaisseController::class, 'modifierPlafondGlobal']);
        Route::put('/{id}/plafond', [CaisseController::class, 'modifierPlafond']);

    });

});
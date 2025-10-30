<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UtilisateurController;
use App\Http\Controllers\EmployeController;
use App\Http\Controllers\EmployeAuthController;
use App\Http\Controllers\AuthController;

// Routes publiques
Route::post('/register', [UtilisateurController::class, 'register']);
Route::post('/login', [UtilisateurController::class, 'login']);
Route::post('/employe/login', [EmployeAuthController::class, 'login']);

// Email verification
Route::post('/verify-email', [UtilisateurController::class, 'verifyEmail']);
Route::post('/resend-verification', [UtilisateurController::class, 'resendVerification']);

// Password reset
Route::post('/forgot-password', [UtilisateurController::class, 'forgotPassword']);
Route::post('/reset-password', [UtilisateurController::class, 'resetPassword']);

// Routes protégées avec JWT
Route::middleware(['jwt.auth'])->group(function () {
    // Logout
    Route::post('/logout', [UtilisateurController::class, 'logout']);
    Route::post('/employe/logout', [EmployeAuthController::class, 'logout']);
    
    // Refresh token
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    
    // Routes produits - accessible à tous les utilisateurs connectés
    Route::get('/products', [ProductController::class, 'index']);
    Route::put('/products/{id}/update-stock', [ProductController::class, 'updateStock']);
    
    // Routes produits - seulement patron et admin
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);
    
    // Routes dashboard - seulement patron et admin
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);
    
    // Routes employés - seulement patron
    Route::middleware(['patron.only'])->group(function () {
        Route::post('/employes', [EmployeController::class, 'store']);
        Route::get('/employes', [EmployeController::class, 'index']);
        Route::delete('/employes/{id}', [EmployeController::class, 'destroy']);
        Route::put('/employes/{id}/role', [EmployeController::class, 'updateRole']);
    });
});
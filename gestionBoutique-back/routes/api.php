<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UtilisateurController;


Route::post('/register', [UtilisateurController::class, 'register']);
Route::post('/login', [UtilisateurController::class, 'login']);

// Routes protégées avec JWT
Route::middleware(['jwt.auth'])->group(function () {
    Route::post('/logout', [UtilisateurController::class, 'logout']);
    
    // Routes produits protégées
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{reference}', [ProductController::class, 'update']);
    Route::delete('/products/{reference}', [ProductController::class, 'destroy']);
    Route::put('/products/{reference}/update-stock', [ProductController::class, 'updateStock']);
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);
});
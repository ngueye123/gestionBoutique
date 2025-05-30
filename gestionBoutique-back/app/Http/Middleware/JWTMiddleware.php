<?php

namespace App\Http\Middleware;

use Closure;
use Exception;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Http\Middleware\BaseMiddleware;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class JWTMiddleware extends BaseMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): JsonResponse
    {
        try {
            // Vérifie si un token est présent dans la requête
            $user = JWTAuth::parseToken()->authenticate();
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token invalide ou expiré, veuillez vous reconnecter',
            ], 401);
        }

        // Autoriser l'accès à la requête
        return $next($request);
    }
}

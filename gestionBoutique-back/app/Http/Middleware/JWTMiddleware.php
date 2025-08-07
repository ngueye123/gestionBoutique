<?php

namespace App\Http\Middleware;

use Closure;
use Exception;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Http\Middleware\BaseMiddleware;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Utilisateur;
use App\Models\Employe;

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
            
            // Vérifier que l'utilisateur existe toujours en base
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur introuvable',
                ], 401);
            }

            // Vérifier le type d'utilisateur et s'assurer qu'il existe encore
            if (get_class($user) === 'App\Models\Utilisateur') {
                $exists = Utilisateur::find($user->id);
            } elseif (get_class($user) === 'App\Models\Employe') {
                $exists = Employe::find($user->id);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Type d\'utilisateur non reconnu',
                ], 401);
            }

            if (!$exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Compte utilisateur introuvable',
                ], 401);
            }

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
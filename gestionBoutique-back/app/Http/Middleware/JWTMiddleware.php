<?php

namespace App\Http\Middleware;

use Closure;
use Exception;
use Tymon\JWTAuth\Http\Middleware\BaseMiddleware;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use App\Models\Utilisateur;
use App\Models\Employe;
use Illuminate\Support\Facades\Log;

class JWTMiddleware extends BaseMiddleware
{
    public function handle($request, Closure $next)
    {
        try {
            // Essayer d'authentifier avec le token
            $user = JWTAuth::parseToken()->authenticate();

            if (!$user) {
                return response()->json([
                    'success' => false, 
                    'message' => 'Utilisateur introuvable.'
                ], 401);
            }

            // Vérifier le type d'utilisateur et son existence en base
            $userClass = get_class($user);
            
            if ($userClass === 'App\Models\Utilisateur') {
                $exists = Utilisateur::find($user->id);
            } elseif ($userClass === 'App\Models\Employe') {
                $exists = Employe::find($user->id);
            } else {
                Log::error('Type utilisateur non reconnu: ' . $userClass);
                return response()->json([
                    'success' => false, 
                    'message' => 'Type d\'utilisateur non reconnu.'
                ], 401);
            }

            if (!$exists) {
                return response()->json([
                    'success' => false, 
                    'message' => 'Compte utilisateur introuvable.'
                ], 401);
            }

            // Définir l'utilisateur authentifié
            Auth::setUser($user);

        } catch (TokenExpiredException $e) {
            return response()->json([
                'success' => false,
                'code' => 'TOKEN_EXPIRED',
                'message' => 'Token expiré, veuillez vous reconnecter.'
            ], 401);
        } catch (TokenInvalidException $e) {
            return response()->json([
                'success' => false,
                'code' => 'TOKEN_INVALID',
                'message' => 'Token invalide.'
            ], 401);
        } catch (Exception $e) {
            Log::error('Erreur JWT Middleware: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'code' => 'TOKEN_ERROR',
                'message' => 'Erreur d\'authentification.'
            ], 401);
        }

        return $next($request);
    }
}
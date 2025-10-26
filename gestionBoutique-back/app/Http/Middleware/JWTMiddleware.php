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

class JWTMiddleware extends BaseMiddleware
{
    public function handle($request, Closure $next): JsonResponse
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();

            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Utilisateur introuvable.'], 401);
            }

            if (get_class($user) === \App\Models\Utilisateur::class) {
                $exists = Utilisateur::find($user->id);
            } elseif (get_class($user) === \App\Models\Employe::class) {
                $exists = Employe::find($user->id);
            } else {
                return response()->json(['success' => false, 'message' => 'Type d’utilisateur non reconnu.'], 401);
            }

            if (!$exists) {
                return response()->json(['success' => false, 'message' => 'Compte utilisateur introuvable.'], 401);
            }
        } catch (TokenExpiredException $e) {
            return response()->json([
                'success' => false,
                'code' => 'TOKEN_EXPIRED',
                'message' => 'Token expiré'
            ], 401);
        } catch (TokenInvalidException $e) {
            return response()->json([
                'success' => false,
                'code' => 'TOKEN_INVALID',
                'message' => 'Token invalide'
            ], 401);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'code' => 'TOKEN_ERROR',
                'message' => 'Erreur de token'
            ], 401);
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Exception;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Illuminate\Support\Facades\Auth;
use App\Models\Utilisateur;
use App\Models\Employe;
use Illuminate\Support\Facades\Log;

class JWTMiddleware
{
    public function handle($request, Closure $next)
    {
        try {
            $token    = JWTAuth::parseToken();
            $payload  = $token->getPayload();
            $sub      = $payload->get('sub');
            $userType = $payload->get('user_type');

            if ($userType === 'employe') {
                $user = Employe::find($sub);
                if (!$user) {
                    return response()->json(['success' => false, 'message' => 'Employé introuvable.'], 401);
                }
            } else {
                $user = Utilisateur::find($sub);
                if (!$user) {
                    return response()->json(['success' => false, 'message' => 'Utilisateur introuvable.'], 401);
                }
            }

            Auth::setUser($user);

        } catch (TokenExpiredException $e) {
            return response()->json(['success' => false, 'code' => 'TOKEN_EXPIRED', 'message' => 'Token expiré.'], 401);
        } catch (TokenInvalidException $e) {
            return response()->json(['success' => false, 'code' => 'TOKEN_INVALID', 'message' => 'Token invalide.'], 401);
        } catch (Exception $e) {
            Log::error('JWT: ' . $e->getMessage());
            return response()->json(['success' => false, 'code' => 'TOKEN_ERROR', 'message' => 'Erreur authentification.'], 401);
        }

        return $next($request);
    }
}

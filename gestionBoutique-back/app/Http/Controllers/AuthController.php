<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\JWTException;

class AuthController extends Controller
{
    public function refresh(): JsonResponse
    {
        try {
            $newToken = JWTAuth::parseToken()->refresh(true, true);
            return response()->json([
                'success' => true,
                'token' => $newToken
            ]);
        } catch (TokenExpiredException $e) {
            return response()->json([
                'success' => false,
                'code' => 'REFRESH_EXPIRED',
                'message' => 'La fenêtre de rafraîchissement est expirée.'
            ], 401);
        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'code' => 'TOKEN_INVALID',
                'message' => 'Token invalide.'
            ], 401);
        }
    }
}

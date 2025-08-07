<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Employe;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Auth;

class EmployeAuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'mot_de_passe' => 'required|string'
        ]);

        $employe = Employe::where('email', $credentials['email'])->first();

        if (!$employe || !Hash::check($credentials['mot_de_passe'], $employe->mot_de_passe)) {
            return response()->json([
                'success' => false, 
                'message' => 'Identifiants invalides'
            ], 401);
        }

        try {
            // Générer le token JWT pour l'employé
            $token = JWTAuth::fromUser($employe);
            
            return response()->json([
                'success' => true,
                'message' => 'Connexion réussie',
                'token' => $token,
                'employe' => [
                    'id' => $employe->id,
                    'nom' => $employe->nom,
                    'email' => $employe->email,
                    'role' => $employe->role,
                    'utilisateur_id' => $employe->utilisateur_id
                ],
                'user_type' => 'employe'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du token'
            ], 500);
        }
    }

    public function logout()
    {
        try {
            $token = JWTAuth::parseToken()->getToken();
            
            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token manquant'
                ], 400);
            }
            
            JWTAuth::invalidate($token);

            return response()->json([
                'success' => true,
                'message' => 'Déconnexion réussie'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la déconnexion'
            ], 500);
        }
    }

    public function me()
    {
        try {
            $employe = Auth::user();
            
            if (!$employe || get_class($employe) !== 'App\Models\Employe') {
                return response()->json([
                    'success' => false,
                    'message' => 'Employé non trouvé'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'employe' => [
                    'id' => $employe->id,
                    'nom' => $employe->nom,
                    'email' => $employe->email,
                    'role' => $employe->role,
                    'utilisateur_id' => $employe->utilisateur_id
                ],
                'user_type' => 'employe'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des informations'
            ], 500);
        }
    }
}
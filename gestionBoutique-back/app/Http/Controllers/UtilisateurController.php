<?php

namespace App\Http\Controllers;

use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
use Illuminate\Support\Facades\Log;
class UtilisateurController extends Controller
{
    // Inscription
    public function register(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:50',
            'prenom' => 'required|string|max:50',
            'email' => 'required|string|email',
            'mot_de_passe' => 'required|string|min:6',
        ]);
    
        // Vérifier si l'email existe déjà
        if (Utilisateur::where('email', $validated['email'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cet email est déjà utilisé. Veuillez en choisir un autre.'
            ], 400);
        }
    
        // Hachage du mot de passe
        $validated['mot_de_passe'] = Hash::make($validated['mot_de_passe']);
    
        // Création de l'utilisateur
        $user = Utilisateur::create($validated);
    
        return response()->json([
            'success' => true,
            'message' => 'Utilisateur créé avec succès',
            'user' => $user
        ], 201);
    }
    
    // Connexion
   /** */ public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|string|email',
            'mot_de_passe' => 'required|string'
        ]);

        // Récupérer l'utilisateur
        $user = Utilisateur::where('email', $credentials['email'])->first();

        // Vérifier le mot de passe
        if (!$user || !Hash::check($credentials['mot_de_passe'], $user->mot_de_passe)) {
            return response()->json([
                'success' => false,
                'message' => 'Identifiants incorrects'
            ], 401);
        }

        // Générer le token JWT
        try {
           
            $token = JWTAuth::fromUser($user);
        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de générer le token'
            ], 500);
        }

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $user
        ], 200);
    }

    // Déconnexion
    public function logout()
    {
        try {
            $token = JWTAuth::parseToken()->getToken(); // Récupérer le token
    
            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token manquant'
                ], 400);
            }
    
            JWTAuth::invalidate($token); // Invalider le token
    
            return response()->json([
                'success' => true,
                'message' => 'Déconnexion réussie'
            ], 200);
        } catch (\Tymon\JWTAuth\Exceptions\TokenInvalidException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token invalide'
            ], 401);
        } catch (\Tymon\JWTAuth\Exceptions\TokenExpiredException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token expiré'
            ], 401);
        } catch (\Tymon\JWTAuth\Exceptions\JWTException $e) {
            Log::error('Erreur JWT : ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la déconnexion : ' . $e->getMessage()
            ], 500);
        }
    }
    
    
  
    
}

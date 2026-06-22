<?php
// app/Http/Controllers/EmployeAuthController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Employe;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class EmployeAuthController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/employe/login
    // ─────────────────────────────────────────────────────────────────────────
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'        => 'required|email',
            'mot_de_passe' => 'required|string',
        ]);

        $employe = Employe::where('email', $credentials['email'])->first();

        // Vérifier identifiants
        if (!$employe || !Hash::check($credentials['mot_de_passe'], $employe->mot_de_passe)) {
            return response()->json([
                'success' => false,
                'message' => 'Identifiants invalides',
            ], 401);
        }

        // ── Bloquer si l'email n'est pas vérifié ─────────────────────────────
        if (!$employe->hasVerifiedEmail()) {
            return response()->json([
                'success'        => false,
                'message'        => 'Veuillez vérifier votre adresse email avant de vous connecter. Consultez votre boîte mail.',
                'email_verified' => false, // Le frontend utilise ce flag
            ], 403);
        }

        $token = JWTAuth::fromUser($employe);

        return response()->json([
            'success' => true,
            'message' => 'Connexion réussie',
            'token'   => $token,
            'employe' => [
                'id'             => $employe->id,
                'nom'            => $employe->nom,
                'email'          => $employe->email,
                'role'           => $employe->role,
                'utilisateur_id' => $employe->utilisateur_id,
                'user_type'      => 'employe',
            ],
            'user_type' => 'employe',
        ]);
    }

    // logout() et me() sont inchangés — conserver le code existant
    public function logout()
    {
        $token = JWTAuth::parseToken()->getToken();
        if (!$token) {
            return response()->json(['success' => false, 'message' => 'Token manquant'], 400);
        }
        JWTAuth::invalidate($token);
        return response()->json(['success' => true, 'message' => 'Déconnexion réussie']);
    }

    public function me()
    {
        $employe = Auth::user();
        if (!$employe || get_class($employe) !== 'App\Models\Employe') {
            return response()->json(['success' => false, 'message' => 'Employé non trouvé'], 404);
        }
        return response()->json([
            'success' => true,
            'employe' => [
                'id'             => $employe->id,
                'nom'            => $employe->nom,
                'email'          => $employe->email,
                'role'           => $employe->role,
                'utilisateur_id' => $employe->utilisateur_id,
            ],
            'user_type' => 'employe',
        ]);
    }
}
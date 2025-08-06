<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Employe;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth;

class EmployeAuthController extends Controller
{
        public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'mot_de_passe' => 'required|string'
        ]);

        $employe = \App\Models\Employe::where('email', $credentials['email'])->first();

        if (!$employe || !\Hash::check($credentials['mot_de_passe'], $employe->mot_de_passe)) {
            return response()->json(['success' => false, 'message' => 'Identifiants invalides'], 401);
        }

        $token = auth()->login($employe); // ⚠️ Assure-toi que ton guard JWT supporte Employe

        return response()->json([
            'success' => true,
            'message' => 'Connexion réussie',
            'token' => $token,
            'employe' => $employe
        ]);
    }


    public function logout()
    {
        JWTAuth::invalidate(JWTAuth::getToken());

        return response()->json([
            'success' => true,
            'message' => 'Déconnexion réussie'
        ]);
    }
}

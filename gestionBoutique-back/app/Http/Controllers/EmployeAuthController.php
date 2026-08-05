<?php
// app/Http/Controllers/EmployeAuthController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Employe;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Notifications\ResetPasswordNotification;

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

    // Demande de réinitialisation du mot de passe employé
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $employe = Employe::where('email', $request->email)->first();

        if (!$employe) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun employé trouvé avec cet email.'
            ], 404);
        }

        $token = Str::random(60);

        DB::table('password_resets_utilisateurs')->updateOrInsert(
            ['email' => $request->email],
            [
                'token' => Hash::make($token),
                'created_at' => Carbon::now(),
            ]
        );

        try {
            $employe->notify(new ResetPasswordNotification($token));
        } catch (\Exception $e) {
            Log::error('Erreur envoi email reset employé: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'envoi de l\'email.'
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Un email de réinitialisation a été envoyé.'
        ], 200);
    }

    // Réinitialiser le mot de passe employé
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'mot_de_passe' => 'required|string|min:6|confirmed'
        ]);

        $reset = DB::table('password_resets_utilisateurs')
            ->where('email', $request->email)
            ->first();

        if (!$reset) {
            return response()->json([
                'success' => false,
                'message' => 'Token invalide.'
            ], 400);
        }

        if (Carbon::parse($reset->created_at)->addMinutes(60)->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Token expiré.'
            ], 400);
        }

        if (!Hash::check($request->token, $reset->token)) {
            return response()->json([
                'success' => false,
                'message' => 'Token invalide.'
            ], 400);
        }

        $employe = Employe::where('email', $request->email)->first();

        if (!$employe) {
            return response()->json([
                'success' => false,
                'message' => 'Employé introuvable.'
            ], 404);
        }

        $employe->mot_de_passe = Hash::make($request->mot_de_passe);
        $employe->save();

        DB::table('password_resets_utilisateurs')
            ->where('email', $request->email)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe réinitialisé avec succès.'
        ], 200);
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
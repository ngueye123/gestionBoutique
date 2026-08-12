<?php

namespace App\Http\Controllers;

use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
use Illuminate\Support\Facades\Log;
use App\Notifications\VerifyEmailNotification;
use App\Notifications\ResetPasswordNotification;
use Carbon\Carbon;

class UtilisateurController extends Controller
{
    // Inscription avec envoi d'email de vérification
    public function register(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:50',
            'prenom' => 'required|string|max:50',
            'email' => 'required|string|email',
            'mot_de_passe' => 'required|string|min:6',
            'nom_boutique' => 'required|string|max:50',
            'adresse_boutique' => 'required|string|max:255',
            'telephone_boutique' => 'string|max:50',
            'logo_boutique' => 'string|max:500'
        ]);

        if (Utilisateur::where('email', $validated['email'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cet email est déjà utilisé.'
            ], 400);
        }

        $validated['mot_de_passe'] = Hash::make($validated['mot_de_passe']);
        $validated['verification_token'] = Str::random(60);

        $user = Utilisateur::create($validated);

        // Envoyer l'email de vérification
        try {
            $user->notify(new VerifyEmailNotification($validated['verification_token']));
        } catch (\Exception $e) {
            Log::error('Erreur envoi email: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Inscription réussie ! Veuillez vérifier votre email pour activer votre compte.',
            'user' => [
                'id' => $user->id,
                'nom' => $user->nom,
                'prenom' => $user->prenom,
                'email' => $user->email,
                'email_verified' => false
            ]
        ], 201);
    }

    // Vérification de l'email
    public function verifyEmail(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email'
        ]);

        $user = Utilisateur::where('email', $request->email)
            ->where('verification_token', $request->token)
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Lien de vérification invalide ou expiré.'
            ], 400);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'message' => 'Email déjà vérifié.'
            ], 200);
        }

        $user->markEmailAsVerified();

        return response()->json([
            'success' => true,
            'message' => 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.'
        ], 200);
    }

    // Renvoyer l'email de vérification
    public function resendVerification(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = Utilisateur::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur introuvable.'
            ], 404);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' => 'Email déjà vérifié.'
            ], 400);
        }

        $user->verification_token = Str::random(60);
        $user->save();

        try {
            $user->notify(new VerifyEmailNotification($user->verification_token));
        } catch (\Exception $e) {
            Log::error('Erreur envoi email: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Impossible d\'envoyer l\'email de vérification. Veuillez réessayer plus tard.'
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Email de vérification renvoyé.'
        ], 200);
    }

    // Connexion
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|string|email',
            'mot_de_passe' => 'required|string'
        ]);

        $user = Utilisateur::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['mot_de_passe'], $user->mot_de_passe)) {
            return response()->json([
                'success' => false,
                'message' => 'Identifiants incorrects'
            ], 401);
        }

        // Vérifier si l'email est vérifié
        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' => 'Veuillez vérifier votre email avant de vous connecter.',
                'email_verified' => false
            ], 403);
        }

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
            'user' => [
                'id' => $user->id,
                'nom' => $user->nom,
                'prenom' => $user->prenom,
                'email' => $user->email,
                'role' => $user->role,
                'user_type' => 'patron',
                'email_verified' => true
            ]
        ], 200);
    }

    // Demande de réinitialisation du mot de passe
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = Utilisateur::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun compte trouvé avec cet email.'
            ], 404);
        }

        // Générer un token
        $token = Str::random(60);

        // Stocker le token dans la table password_resets
        DB::table('password_resets_utilisateurs')->updateOrInsert(
            ['email' => $request->email],
            [
                'token' => Hash::make($token),
                'created_at' => Carbon::now()
            ]
        );

        // Envoyer l'email
        try {
            $user->notify(new ResetPasswordNotification($token));
        } catch (\Exception $e) {
            Log::error('Erreur envoi email reset: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Impossible d\'envoyer l\'email de réinitialisation. Veuillez réessayer plus tard.'
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Un email de réinitialisation a été envoyé.'
        ], 200);
    }

    // Réinitialiser le mot de passe
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

        // Vérifier que le token n'est pas expiré (60 minutes)
        if (Carbon::parse($reset->created_at)->addMinutes(60)->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Token expiré.'
            ], 400);
        }

        // Vérifier le token
        if (!Hash::check($request->token, $reset->token)) {
            return response()->json([
                'success' => false,
                'message' => 'Token invalide.'
            ], 400);
        }

        $user = Utilisateur::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur introuvable.'
            ], 404);
        }

        $user->mot_de_passe = Hash::make($request->mot_de_passe);
        $user->save();

        // Supprimer le token
        DB::table('password_resets_utilisateurs')
            ->where('email', $request->email)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe réinitialisé avec succès.'
        ], 200);
    }

    // Déconnexion
    public function logout()
    {
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
        ], 200);
    }
}
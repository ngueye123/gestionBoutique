<?php
// app/Http/Controllers/EmployeController.php

namespace App\Http\Controllers;

use App\Models\Employe;
use App\Notifications\VerifyEmployeEmailNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class EmployeController extends Controller
{
    use RoleHelper;

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/employes
    // Créer un employé et envoyer l'email de vérification
    // ─────────────────────────────────────────────────────────────────────────
    public function store(Request $request)
    {
        if (!$this->canManageEmployees()) {
            return $this->accessDeniedResponse('Seuls les patrons peuvent gérer les employés');
        }

        $validated = $request->validate([
            'nom'         => 'required|string|max:255',
            'email'       => 'required|email',
            'mot_de_passe'=> 'required|min:6',
            'role'        => 'required|string|in:admin,vendeur,caissier',
        ]);

        $utilisateurId = Auth::id();

        // Vérifier unicité de l'email parmi tous les employés
        if (Employe::where('email', $validated['email'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cet email est déjà utilisé'
            ], 400);
        }

        // Générer un token de vérification unique
        $verificationToken = Str::random(60);

        $employe = Employe::create([
            'nom'                => $validated['nom'],
            'email'              => $validated['email'],
            'mot_de_passe'       => Hash::make($validated['mot_de_passe']),
            'role'               => $validated['role'],
            'utilisateur_id'     => $utilisateurId,
            'email_verified_at'  => null,          // Non vérifié à la création
            'verification_token' => $verificationToken,
        ]);

        // Récupérer le nom du patron pour personnaliser l'email
        $patron   = Auth::user();
        $nomPatron = $patron->nom_boutique ?? ($patron->prenom . ' ' . $patron->nom);

        // Envoyer l'email de vérification (on catch l'erreur pour ne pas bloquer)
        try {
            $employe->notify(new VerifyEmployeEmailNotification($verificationToken, $nomPatron));
        } catch (\Exception $e) {
            Log::error('Erreur envoi email vérification employé: ' . $e->getMessage());
            // On continue malgré l'erreur : l'employé existe, le patron peut renvoyer
        }

        return response()->json([
            'success' => true,
            'message' => 'Employé ajouté. Un email de vérification a été envoyé à ' . $employe->email,
            'employe' => $employe,
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/employes
    // ─────────────────────────────────────────────────────────────────────────
    public function index()
    {
        if (!$this->canManageEmployees()) {
            return $this->accessDeniedResponse('Seuls les patrons peuvent voir la liste des employés');
        }

        $utilisateurId = Auth::id();

        $employes = Employe::where('utilisateur_id', $utilisateurId)
            ->get()
            ->map(function (Employe $e) {
                // Ajouter le statut de vérification dans la réponse
                return array_merge($e->toArray(), [
                    'email_verified' => $e->hasVerifiedEmail(),
                ]);
            });

        return response()->json([
            'success'  => true,
            'employes' => $employes,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/employes/{id}
    // ─────────────────────────────────────────────────────────────────────────
    public function destroy($id)
    {
        if (!$this->canManageEmployees()) {
            return $this->accessDeniedResponse('Seuls les patrons peuvent supprimer des employés');
        }

        $utilisateurId = Auth::id();
        $employe = Employe::where('id', $id)
            ->where('utilisateur_id', $utilisateurId)
            ->first();

        if (!$employe) {
            return response()->json([
                'success' => false,
                'message' => 'Employé introuvable'
            ], 404);
        }

        $employe->delete();

        return response()->json([
            'success' => true,
            'message' => 'Employé supprimé avec succès'
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/employes/{id}/role
    // ─────────────────────────────────────────────────────────────────────────
    public function updateRole(Request $request, $id)
    {
        if (!$this->canManageEmployees()) {
            return $this->accessDeniedResponse('Seuls les patrons peuvent modifier les rôles');
        }

        $request->validate([
            'role' => 'required|string|in:admin,vendeur,caissier'
        ]);

        $utilisateurId = Auth::id();
        $employe = Employe::where('id', $id)
            ->where('utilisateur_id', $utilisateurId)
            ->first();

        if (!$employe) {
            return response()->json([
                'success' => false,
                'message' => 'Employé introuvable'
            ], 404);
        }

        $employe->role = $request->role;
        $employe->save();

        return response()->json([
            'success' => true,
            'message' => 'Rôle mis à jour avec succès',
            'employe' => $employe,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/employe/verify-email  (route PUBLIQUE)
    // Appelé depuis le lien dans l'email de l'employé
    // ─────────────────────────────────────────────────────────────────────────
    public function verifyEmail(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
        ]);

        $employe = Employe::where('email', $request->email)
            ->where('verification_token', $request->token)
            ->first();

        if (!$employe) {
            return response()->json([
                'success' => false,
                'message' => 'Lien de vérification invalide ou expiré.',
            ], 400);
        }

        // Déjà vérifié → retourner un succès quand même
        if ($employe->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'message' => 'Email déjà vérifié. Vous pouvez vous connecter.',
            ]);
        }

        $employe->markEmailAsVerified();

        return response()->json([
            'success' => true,
            'message' => 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/employes/{id}/resend-verification  (route PROTÉGÉE — patron)
    // Permet au patron de renvoyer l'email de vérification
    // ─────────────────────────────────────────────────────────────────────────
    public function resendVerification(Request $request, int $id)
    {
        if (!$this->canManageEmployees()) {
            return $this->accessDeniedResponse('Accès refusé');
        }

        $utilisateurId = Auth::id();
        $employe = Employe::where('id', $id)
            ->where('utilisateur_id', $utilisateurId)
            ->first();

        if (!$employe) {
            return response()->json([
                'success' => false,
                'message' => 'Employé introuvable',
            ], 404);
        }

        if ($employe->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' => 'Cet email est déjà vérifié.',
            ], 400);
        }

        // Générer un nouveau token (invalide l'ancien)
        $employe->verification_token = Str::random(60);
        $employe->save();

        $patron    = Auth::user();
        $nomPatron = $patron->nom_boutique ?? ($patron->prenom . ' ' . $patron->nom);

        try {
            $employe->notify(new VerifyEmployeEmailNotification($employe->verification_token, $nomPatron));
        } catch (\Exception $e) {
            Log::error('Erreur renvoi email vérification employé: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => "Erreur lors de l'envoi de l'email.",
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Email de vérification renvoyé à ' . $employe->email,
        ]);
    }
}
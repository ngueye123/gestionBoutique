<?php

namespace App\Http\Controllers;

use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class ProfileBoutiqueController extends Controller
{
    use RoleHelper;

    /**
     * GET /api/profile-boutique (patron et admin, lecture seule pour l'admin)
     */
    public function show(): JsonResponse
    {
        if (!$this->isPatron() && !$this->isEmployeAdmin()) {
            return $this->accessDeniedResponse('Accès réservé au propriétaire ou à un admin');
        }

        $ownerId = $this->getOwnerId();
        $owner = Utilisateur::findOrFail($ownerId);

        return response()->json([
            'success' => true,
            'profile' => [
                'id' => $owner->id,
                'nom' => $owner->nom,
                'prenom' => $owner->prenom,
                'email' => $owner->email,
                'email_verified' => !is_null($owner->email_verified_at),
                'nom_boutique' => $owner->nom_boutique,
                'adresse_boutique' => $owner->adresse_boutique,
                'telephone_boutique' => $owner->telephone_boutique,
                'logo_boutique' => $owner->logo_boutique,
            ],
        ]);
    }

    /**
     * PUT /api/profile-boutique (patron uniquement)
     */
    public function update(Request $request): JsonResponse
    {
        if (!$this->isPatron()) {
            return $this->accessDeniedResponse('Seul le propriétaire peut modifier ces informations');
        }

        $ownerId = $this->getOwnerId();
        $owner = Utilisateur::findOrFail($ownerId);

        $validated = $request->validate([
            'nom' => 'required|string|max:50',
            'prenom' => 'required|string|max:50',
            'email' => ['required', 'string', 'email', 'max:50', Rule::unique('utilisateurs', 'email')->ignore($owner->id)],
            'nom_boutique' => 'nullable|string|max:255',
            'adresse_boutique' => 'nullable|string|max:500',
            'telephone_boutique' => 'nullable|string|max:50',
            'logo_boutique' => 'nullable|string|max:255',
        ]);

        $owner->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profil de la boutique mis à jour avec succès',
            'profile' => [
                'id' => $owner->id,
                'nom' => $owner->nom,
                'prenom' => $owner->prenom,
                'email' => $owner->email,
                'email_verified' => !is_null($owner->email_verified_at),
                'nom_boutique' => $owner->nom_boutique,
                'adresse_boutique' => $owner->adresse_boutique,
                'telephone_boutique' => $owner->telephone_boutique,
                'logo_boutique' => $owner->logo_boutique,
            ],
        ]);
    }
}

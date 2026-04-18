<?php

namespace App\Http\Controllers;

use App\Models\Employe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class EmployeController extends Controller
{
    use RoleHelper;

    public function store(Request $request)
    {
        if (!$this->canManageEmployees()) {
            return $this->accessDeniedResponse('Seuls les patrons peuvent gérer les employés');
        }

        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'email' => 'required|email',
            'mot_de_passe' => 'required|min:6',
            'role' => 'required|string|in:admin,vendeur,caissier',
        ]);

        $utilisateurId = Auth::id();

        if (Employe::where('email', $validated['email'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cet email est déjà utilisé'
            ], 400);
        }



        $employe = Employe::create([
            'nom' => $validated['nom'],
            'email' => $validated['email'],
            'mot_de_passe' => Hash::make($validated['mot_de_passe']),
            'role' => $validated['role'],
            'utilisateur_id' => $utilisateurId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Employé ajouté avec succès',
            'employe' => $employe
        ], 201);
    }

    public function index()
    {
        if (!$this->canManageEmployees()) {
            return $this->accessDeniedResponse('Seuls les patrons peuvent voir la liste des employés');
        }

        $utilisateurId = Auth::id();
        $employes = Employe::where('utilisateur_id', $utilisateurId)->get();

        return response()->json([
            'success' => true,
            'employes' => $employes
        ]);
    }

    public function destroy($id)
    {
        if (!$this->canManageEmployees()) {
            return $this->accessDeniedResponse('Seuls les patrons peuvent supprimer des employés');
        }

        $utilisateurId = Auth::id();
        $employe = Employe::where('id', $id)->where('utilisateur_id', $utilisateurId)->first();

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

    public function updateRole(Request $request, $id)
    {
        if (!$this->canManageEmployees()) {
            return $this->accessDeniedResponse('Seuls les patrons peuvent modifier les rôles');
        }

        $request->validate([
            'role' => 'required|string|in:admin,vendeur,caissier'
        ]);

        $utilisateurId = Auth::id();
        $employe = Employe::where('id', $id)->where('utilisateur_id', $utilisateurId)->first();

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
            'employe' => $employe
        ]);
    }
}
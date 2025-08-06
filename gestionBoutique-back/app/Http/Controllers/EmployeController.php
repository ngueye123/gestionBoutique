<?php

namespace App\Http\Controllers;

use App\Models\Employe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class EmployeController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'email' => 'required|email',
            'mot_de_passe' => 'required|min:6',
            'role' => 'required|string|max:100',
        ]);

        $utilisateurId = Auth::id(); // ID du patron connecté

         if (Employe::where('email', $validated['email'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cet email est déjà utilisé. Veuillez en choisir un autre.'
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
        $utilisateurId = Auth::id();
        $employes = Employe::where('utilisateur_id', $utilisateurId)->get();

        return response()->json($employes);
    }

        public function destroy($id)
    {
        $utilisateurId = Auth::id();
        $employe = Employe::where('id', $id)->where('utilisateur_id', $utilisateurId)->first();

        if (!$employe) {
            return response()->json([
                'success' => false,
                'message' => 'Employé introuvable ou non autorisé'
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
        $request->validate([
            'role' => 'required|string|in:admin,vendeur,caissier' // Tu peux modifier les rôles ici
        ]);

        $utilisateurId = Auth::id();
        $employe = Employe::where('id', $id)->where('utilisateur_id', $utilisateurId)->first();

        if (!$employe) {
            return response()->json([
                'success' => false,
                'message' => 'Employé introuvable ou non autorisé'
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


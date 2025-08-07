<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;

trait RoleHelper
{
    /**
     * Vérifie si l'utilisateur connecté est un patron
     */
    protected function isPatron()
    {
        $user = Auth::user();
        return $user && get_class($user) === 'App\Models\Utilisateur';
    }

    /**
     * Vérifie si l'utilisateur connecté est un employé admin
     */
    protected function isEmployeAdmin()
    {
        $user = Auth::user();
        return $user && get_class($user) === 'App\Models\Employe' && $user->role === 'admin';
    }

    /**
     * Vérifie si l'utilisateur connecté est un employé vendeur
     */
    protected function isEmployeVendeur()
    {
        $user = Auth::user();
        return $user && get_class($user) === 'App\Models\Employe' && $user->role === 'vendeur';
    }

    /**
     * Vérifie si l'utilisateur peut gérer les produits (CRUD)
     */
    protected function canManageProducts()
    {
        return $this->isPatron() || $this->isEmployeAdmin();
    }

    /**
     * Vérifie si l'utilisateur peut voir les produits
     */
    protected function canViewProducts()
    {
        return $this->isPatron() || $this->isEmployeAdmin() || $this->isEmployeVendeur();
    }

    /**
     * Vérifie si l'utilisateur peut gérer les employés
     */
    protected function canManageEmployees()
    {
        return $this->isPatron();
    }

    /**
     * Récupère l'ID du propriétaire (patron) pour les requêtes
     */
    protected function getOwnerId()
    {
        $user = Auth::user();
        
        if (get_class($user) === 'App\Models\Utilisateur') {
            return $user->id;
        } elseif (get_class($user) === 'App\Models\Employe') {
            return $user->utilisateur_id;
        }
        
        return null;
    }

    /**
     * Retourne une réponse d'erreur d'accès refusé
     */
    protected function accessDeniedResponse($message = 'Accès refusé')
    {
        return response()->json([
            'success' => false,
            'message' => $message
        ], 403);
    }
}
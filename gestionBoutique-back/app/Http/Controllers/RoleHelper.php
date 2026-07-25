<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;

trait RoleHelper
{
    /**
     * Récupère dynamiquement l'utilisateur authentifié
     * en testant successivement les guards "api" et "employe"
     */
    protected function getAuthenticatedUser()
    {
        // Teste le guard patron
        if (auth('api')->check()) {
            return auth('api')->user();
        }

        // Teste le guard employé
        if (auth('employe')->check()) {
            return auth('employe')->user();
        }

        // Aucun utilisateur trouvé
        return null;
    }

    /**
     * Vérifie si l'utilisateur connecté est un patron
     */
    protected function isPatron()
    {
        $user = $this->getAuthenticatedUser();
        return $user && get_class($user) === 'App\Models\Utilisateur';
    }

    /**
     * Vérifie si l'utilisateur connecté est un employé admin
     */
    protected function isEmployeAdmin()
    {
        $user = $this->getAuthenticatedUser();
        return $user && get_class($user) === 'App\Models\Employe' && $user->role === 'admin';
    }

    /**
     * Vérifie si l'utilisateur connecté est un employé vendeur
     */
    protected function isEmployeVendeur()
    {
        $user = $this->getAuthenticatedUser();
        return $user && get_class($user) === 'App\Models\Employe' && $user->role === 'vendeur';
    }

    /**
     * Vérifie si l'utilisateur connecté est un employé caissier
     */
    protected function isEmployeCaissier()
    {
        $user = $this->getAuthenticatedUser();
        return $user && get_class($user) === 'App\Models\Employe' && $user->role === 'caissier';
    }

    protected function canManageEmployees()
    {
        return $this->isPatron();
    }

    /**
     * Vérifie si l'utilisateur peut gérer les produits (CRUD)
     */
    protected function canManageProducts()
    {
        return $this->isPatron() || $this->isEmployeAdmin() || $this->isEmployeVendeur();
    }

    protected function canManageDepenses()
    {
        return $this->isPatron() || $this->isEmployeAdmin();
    }

    protected function canCreateCodePin()
    {
        return $this->isPatron() || $this->isEmployeAdmin();
    }

    /**
     * Vérifie si l'utilisateur peut voir les produits
     */
    protected function canViewProducts()
    {
        return $this->isPatron()
            || $this->isEmployeAdmin()
            || $this->isEmployeVendeur()
            || $this->isEmployeCaissier();
    }

    public function canViewDashboard()
    {
        return $this->isPatron() || $this->isEmployeAdmin();
    }

    /**
     * Récupère l'ID du propriétaire (patron) pour les requêtes
     */
    protected function getOwnerId()
    {
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            return null;
        }

        // Si c'est un patron
        if (get_class($user) === 'App\Models\Utilisateur') {
            return $user->id;
        }

        // Si c'est un employé
        if (get_class($user) === 'App\Models\Employe') {
            return $user->utilisateur_id;
        }

        return null;
    }

    /**
     * Réponse standard d'accès refusé
     */
    protected function accessDeniedResponse($message = 'Accès refusé')
    {
        return response()->json([
            'success' => false,
            'message' => $message
        ], 403);
    }
}

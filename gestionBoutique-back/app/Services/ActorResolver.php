<?php

namespace App\Services;

use App\Models\Employe;
use App\Models\Utilisateur;

class ActorResolver
{
    /**
     * Résout l'acteur authentifié en testant le guard 'employe' puis 'api'.
     * Source unique de vérité — remplace getActor()/resolveActor() dupliqués
     * dans CaisseController, VenteController, RemboursementController,
     * CheckCaissePlafond.
     */
    public function resolve(): Employe|Utilisateur
    {
        try {
            $employe = auth('employe')->user();
            if ($employe instanceof Employe) {
                return $employe;
            }
        } catch (\Exception $e) {}

        try {
            $utilisateur = auth('api')->user();
            if ($utilisateur instanceof Utilisateur) {
                return $utilisateur;
            }
        } catch (\Exception $e) {}

        abort(401, 'Non authentifié.');
    }

    /**
     * Version "douce" — retourne null au lieu de lever une exception.
     * Utile dans les middlewares qui gèrent eux-mêmes l'absence d'acteur.
     */
    public function resolveOrNull(): Employe|Utilisateur|null
    {
        try {
            return $this->resolve();
        } catch (\Throwable $e) {
            return null;
        }
    }
}

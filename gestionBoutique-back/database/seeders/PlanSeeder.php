<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Crée le plan par défaut de l'application si aucun plan n'existe encore.
     *
     * ⚠️ Le prix (price_xof) est un placeholder — à ajuster avant mise en production.
     */
    public function run(): void
    {
        Plan::firstOrCreate(
            ['slug' => 'standard'],
            [
                'name'             => 'Standard',
                'price_xof'        => 15000,
                'billing_interval' => 'monthly',
                'features'         => [
                    'produits_illimites',
                    'ventes_illimitees',
                    'gestion_employes',
                    'programme_fidelite',
                ],
                'is_active'        => true,
            ]
        );
    }
}

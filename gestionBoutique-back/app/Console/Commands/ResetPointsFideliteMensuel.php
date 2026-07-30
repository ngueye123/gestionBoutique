<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetPointsFideliteMensuel extends Command
{
    protected $signature = 'fidelite:reset-mensuel';

    protected $description = "Remet à zéro le solde de points de tous les clients le 1er du mois. "
        . "L'historique du mois écoulé est déjà conservé dans fidelite_historiques (alimenté en temps réel).";

    public function handle(): int
    {
        $count = DB::table('clients')
            ->where('solde_points', '>', 0)
            ->update(['solde_points' => 0, 'updated_at' => now()]);

        $this->info("Points fidélité remis à zéro pour {$count} client(s).");

        return self::SUCCESS;
    }
}
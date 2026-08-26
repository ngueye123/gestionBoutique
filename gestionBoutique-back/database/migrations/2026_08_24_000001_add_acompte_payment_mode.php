<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE vente_paiements MODIFY mode ENUM('especes','wave','orange_money','dette','acompte') NOT NULL");
        DB::statement("ALTER TABLE ventes MODIFY moyen_paiement ENUM('especes','wave','orange_money','dette','acompte','mixte') NOT NULL DEFAULT 'especes'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE vente_paiements MODIFY mode ENUM('especes','wave','orange_money','dette') NOT NULL");
        DB::statement("ALTER TABLE ventes MODIFY moyen_paiement ENUM('especes','wave','orange_money','dette','mixte') NOT NULL DEFAULT 'especes'");
    }
};
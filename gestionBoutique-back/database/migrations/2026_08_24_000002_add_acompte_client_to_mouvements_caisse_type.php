<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE mouvements_caisse MODIFY COLUMN type ENUM('vente','apport','prelevement','remboursement','remboursement_dette','depense','ajustement_depense','acompte_client') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE mouvements_caisse MODIFY COLUMN type ENUM('vente','apport','prelevement','remboursement','remboursement_dette','depense','ajustement_depense') NOT NULL");
    }
};
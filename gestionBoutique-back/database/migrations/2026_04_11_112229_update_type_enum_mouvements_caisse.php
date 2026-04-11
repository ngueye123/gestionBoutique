<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE mouvements_caisse MODIFY COLUMN type ENUM('vente','apport','prelevement','remboursement','remboursement_dette') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE mouvements_caisse MODIFY COLUMN type ENUM('vente','apport','prelevement','remboursement') NOT NULL");
    }
};

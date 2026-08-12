<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // doctrine/dbal n'étant pas installé, on modifie la colonne en SQL brut
        DB::statement('ALTER TABLE utilisateurs MODIFY telephone_boutique VARCHAR(50) NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE utilisateurs MODIFY telephone_boutique VARCHAR(20) NULL');
    }
};

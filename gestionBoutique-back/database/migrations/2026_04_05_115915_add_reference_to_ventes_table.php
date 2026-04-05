<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            // On ajoute la colonne 'reference'. 
            // L'option after('id') permet de la placer juste après l'ID pour que ce soit plus propre visuellement dans la BDD.
            $table->string('reference', 20)->nullable()->unique()->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            // On supprime la colonne si on doit annuler la migration
            $table->dropColumn('reference');
        });
    }
};
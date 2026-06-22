
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            // employe_id est filtré dans les requêtes de ventes par employé
            // mais n'a pas d'index dédié (seulement la FK implicite, pas optimale pour les filtres)
            $table->index('employe_id', 'idx_ventes_employe_id');

            
        });
    }

    public function down(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            $table->dropIndex('idx_ventes_employe_id');
        });
    }
};
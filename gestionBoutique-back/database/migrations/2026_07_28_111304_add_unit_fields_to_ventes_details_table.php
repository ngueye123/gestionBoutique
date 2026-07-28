<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventes_details', function (Blueprint $table) {
            $table->decimal('quantite', 12, 3)->change(); // était integer

            $table->string('unite_vente', 10)->default('piece')->after('quantite');
            $table->decimal('quantite_base', 12, 3)->after('unite_vente');
            $table->string('unite_prix', 10)->default('piece')->after('prix_unitaire');
        });
    }

    public function down(): void
    {
        Schema::table('ventes_details', function (Blueprint $table) {
            $table->dropColumn(['unite_vente', 'quantite_base', 'unite_prix']);
            $table->integer('quantite')->change();
        });
    }
};
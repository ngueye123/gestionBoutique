<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->string('nom_boutique', 255)->nullable()->after('prenom');
            $table->string('adresse_boutique', 500)->nullable()->after('nom_boutique');
            $table->string('telephone_boutique', 20)->nullable()->after('adresse_boutique');
            $table->string('logo_boutique', 255)->nullable()->after('telephone_boutique');
        });
    }

    public function down(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropColumn(['nom_boutique', 'adresse_boutique', 'telephone_boutique', 'logo_boutique']);
        });
    }
};
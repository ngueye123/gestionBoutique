<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caisses', function (Blueprint $table) {
            $table->id();

            // Propriétaire de la caisse (employé OU patron)
            // On stocke les deux colonnes nullable pour supporter les deux modèles
            $table->unsignedBigInteger('employe_id')->nullable()->index();
            $table->unsignedBigInteger('utilisateur_id')->index(); // = patron propriétaire (pour multi-tenant)

            $table->decimal('solde_actuel', 15, 2)->default(0);
            $table->decimal('plafond', 15, 2)->default(500000); // Plafond défini par le patron
            $table->boolean('est_bloquee')->default(false);     // Blocage manuel possible
            $table->timestamps();

            // Une seule caisse par employé (ou par patron s'il n'a pas d'employé)
            $table->unique(['employe_id', 'utilisateur_id']);

            $table->foreign('employe_id')->references('id')->on('employes')->onDelete('cascade');
            $table->foreign('utilisateur_id')->references('id')->on('utilisateurs')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caisses');
    }
};
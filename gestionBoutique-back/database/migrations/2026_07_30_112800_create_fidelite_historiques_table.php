<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fidelite_historiques', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('utilisateur_id');
            $table->unsignedTinyInteger('mois');      // 1-12
            $table->unsignedSmallInteger('annee');    // ex: 2026
            $table->unsignedInteger('montant_achat_total')->default(0);
            $table->unsignedInteger('points_total')->default(0);
            $table->boolean('est_consomme')->default(false);
            $table->unsignedBigInteger('consomme_par')->nullable(); // id patron/employé ayant coché
            $table->timestamp('consomme_at')->nullable();
            $table->timestamps();

            $table->unique(['client_id', 'mois', 'annee']); // 1 ligne par client et par mois
            $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
            $table->foreign('utilisateur_id')->references('id')->on('utilisateurs')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fidelite_historiques');
    }
};
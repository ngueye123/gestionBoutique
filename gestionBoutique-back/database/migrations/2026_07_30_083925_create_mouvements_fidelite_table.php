<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mouvements_fidelite', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('utilisateur_id');
            $table->enum('type', ['vente', 'remboursement_dette', 'ajustement_manuel']);
            $table->unsignedBigInteger('source_id')->nullable(); // vente_id ou remboursement_id
            $table->unsignedInteger('montant_reference'); // montant comptant / remboursé ayant servi au calcul
            $table->unsignedInteger('points')->default(0);
            $table->unsignedInteger('solde_avant');
            $table->unsignedInteger('solde_apres');
            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
            $table->foreign('utilisateur_id')->references('id')->on('utilisateurs')->onDelete('cascade');

            $table->index(['client_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mouvements_fidelite');
    }
};
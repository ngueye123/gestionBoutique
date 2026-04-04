<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bilans_caisse', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('caisse_id')->index();
            $table->unsignedBigInteger('utilisateur_id')->index();

            // Période
            $table->date('date_debut');
            $table->date('date_fin');

            // Montants calculés
            $table->decimal('solde_debut',     15, 2)->default(0);
            $table->decimal('total_entrees',   15, 2)->default(0);
            $table->decimal('total_sorties',   15, 2)->default(0);
            $table->decimal('solde_theorique', 15, 2)->default(0);
            $table->decimal('solde_reel',      15, 2);          // obligatoire
            $table->decimal('ecart',           15, 2)->default(0);

            // Compteurs
            $table->unsignedInteger('nombre_ventes')->default(0);
            $table->unsignedInteger('nombre_remboursements')->default(0);
            $table->unsignedInteger('nombre_prelevements')->default(0);

            // Statut écart
            $table->enum('statut_ecart', ['equilibre', 'surplus', 'manquant'])->default('equilibre');

            // Référence ticket PDF
            $table->string('ticket_reference')->nullable();

            // Qui a fait le bilan
            $table->string('effectue_par')->nullable();

            $table->timestamps();

            $table->foreign('caisse_id')->references('id')->on('caisses')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bilans_caisse');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mouvements_caisse', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('caisse_id')->index();
            $table->unsignedBigInteger('utilisateur_id')->index(); // patron (multi-tenant)

            // Type de mouvement
            $table->enum('type', [
                'vente',        // Entrée automatique lors d'une vente espèces
                'apport',       // Ajout manuel (ex: fond de caisse du matin)
                'prelevement',  // Retrait manuel pour sécuriser les fonds
            ]);

            $table->decimal('montant', 15, 2);          // Toujours positif
            $table->decimal('solde_avant', 15, 2);      // Solde avant le mouvement (traçabilité)
            $table->decimal('solde_apres', 15, 2);      // Solde après le mouvement

            $table->unsignedBigInteger('vente_id')->nullable(); // Lien vers la vente si type=vente
            $table->string('note')->nullable();

            // Ticket de prélèvement
            $table->string('ticket_reference')->nullable()->unique(); // ex: PREL-20260203-0001

            $table->timestamps();

            $table->foreign('caisse_id')->references('id')->on('caisses')->onDelete('cascade');
            $table->foreign('utilisateur_id')->references('id')->on('utilisateurs')->onDelete('cascade');
            $table->foreign('vente_id')->references('id')->on('ventes')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mouvements_caisse');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vente_paiements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vente_id')->constrained('ventes')->cascadeOnDelete();
            $table->enum('mode', ['especes', 'wave', 'orange_money', 'dette']);
            $table->decimal('montant', 10, 2);           // montant réellement affecté à la vente
            $table->decimal('montant_recu', 10, 2)->nullable();   // espèces uniquement
            $table->decimal('monnaie_rendue', 10, 2)->nullable(); // espèces uniquement
            $table->string('reference_transaction', 50)->nullable(); // wave / orange money
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete(); // dette
            $table->timestamps();

            $table->index(['vente_id', 'mode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vente_paiements');
    }
};
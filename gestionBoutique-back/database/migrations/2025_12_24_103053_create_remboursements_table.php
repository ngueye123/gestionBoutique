<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('remboursements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('utilisateur_id'); // Patron
            $table->unsignedBigInteger('employe_id')->nullable(); // Employé qui a enregistré
            $table->decimal('montant', 10, 2);
            $table->enum('moyen_paiement', ['especes', 'wave', 'orange_money', 'carte']);
            $table->text('note')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('client_id')
                ->references('id')
                ->on('clients')
                ->onDelete('cascade');

            $table->foreign('utilisateur_id')
                ->references('id')
                ->on('utilisateurs')
                ->onDelete('cascade');

            $table->foreign('employe_id')
                ->references('id')
                ->on('employes')
                ->onDelete('set null');

            $table->index(['client_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('remboursements');
    }
};
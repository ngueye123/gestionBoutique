<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('telephone')->unique();
            $table->unsignedBigInteger('utilisateur_id'); // Patron propriétaire
            $table->decimal('solde_dette', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('utilisateur_id')
                ->references('id')
                ->on('utilisateurs')
                ->onDelete('cascade');

            // Index pour la recherche rapide
            $table->index(['utilisateur_id', 'nom']);
            $table->index(['utilisateur_id', 'telephone']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
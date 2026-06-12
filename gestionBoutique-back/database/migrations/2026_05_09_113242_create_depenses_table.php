<?php
// database/migrations/xxxx_xx_xx_create_depenses_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('depenses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('utilisateur_id');
            $table->decimal('montant', 12, 2);
            $table->date('date_depense');
            $table->string('description', 500);
            $table->string('categorie', 100)->default('autre');
            $table->timestamps();

            $table->foreign('utilisateur_id')
                  ->references('id')
                  ->on('utilisateurs')
                  ->onDelete('cascade');

            // Index pour accélérer les filtres mois/année
            $table->index(['utilisateur_id', 'date_depense']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('depenses');
    }
};
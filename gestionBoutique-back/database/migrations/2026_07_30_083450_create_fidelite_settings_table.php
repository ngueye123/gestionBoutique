<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fidelite_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('utilisateur_id')->unique(); // 1 config par patron
            $table->unsignedInteger('montant_tranche'); // ex: 1000 (FCFA)
            $table->unsignedInteger('points_accordes');  // ex: 1 (point)
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('utilisateur_id')
                ->references('id')->on('utilisateurs')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fidelite_settings');
    }
};
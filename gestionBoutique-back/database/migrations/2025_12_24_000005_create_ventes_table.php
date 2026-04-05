<?php

// database/migrations/xxxx_xx_xx_create_ventes_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ventes', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 20)->unique();
            $table->foreignId('utilisateur_id')->constrained('utilisateurs')->cascadeOnDelete();
            $table->foreignId('employe_id')->nullable()->constrained('employes')->nullOnDelete();
            $table->decimal('total', 10, 2);
            $table->enum('moyen_paiement', ['especes', 'wave', 'orange_money', 'dette'])->default('especes');
            $table->decimal('montant_recu', 10, 2)->nullable();
            $table->decimal('monnaie', 10, 2)->nullable();
            $table->timestamps();

            $table->index(['created_at', 'utilisateur_id'], 'idx_date_utilisateur');
            $table->index('moyen_paiement');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ventes');
    }
};


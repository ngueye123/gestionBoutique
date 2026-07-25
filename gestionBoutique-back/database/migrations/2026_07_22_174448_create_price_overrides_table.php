<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('price_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vente_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vente_detail_id')->constrained('ventes_details')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('employe_id')->nullable()->constrained('employes')->nullOnDelete();
            $table->decimal('prix_normal', 10, 2);
            $table->decimal('prix_applique', 10, 2);
            $table->string('justification')->nullable();
            $table->boolean('pin_utilise')->default(false);
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('price_overrides');
    }
};

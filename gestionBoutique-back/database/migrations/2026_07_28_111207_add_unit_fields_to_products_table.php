<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->enum('unit_type', ['piece', 'masse', 'volume', 'longueur'])
                  ->default('piece')
                  ->after('category');

            $table->string('unit_reference', 10)->default('piece')->after('unit_type');
        });

        // stock/min_stock passent en decimal (3 décimales = précision au gramme/ml/mm)
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('stock', 12, 3)->default(0)->change();
            $table->decimal('min_stock', 12, 3)->default(0)->change();
        });

        // Backfill : tous les produits existants restent en 'piece' (base = référence,
        // donc stock/min_stock gardent leur valeur telle quelle)
        DB::table('products')->update([
            'unit_type' => 'piece',
            'unit_reference' => 'piece',
        ]);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['unit_type', 'unit_reference']);
            $table->integer('stock')->default(0)->change();
            $table->integer('min_stock')->default(0)->change();
        });
    }
};
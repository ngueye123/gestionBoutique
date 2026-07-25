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
        Schema::table('ventes_details', function (Blueprint $table) {
            $table->decimal('prix_original', 10, 2)->nullable()->after('prix_unitaire');
            $table->boolean('prix_override')->default(false)->after('prix_original');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventes_details', function (Blueprint $table) {
            $table->dropColumn(['prix_original', 'prix_override']);
        });
    }
};

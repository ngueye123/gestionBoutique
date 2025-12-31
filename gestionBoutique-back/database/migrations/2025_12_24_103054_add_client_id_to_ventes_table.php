<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            // Ajouter client_id pour les ventes à crédit
            $table->unsignedBigInteger('client_id')->nullable()->after('employe_id');
            
            $table->foreign('client_id')
                ->references('id')
                ->on('clients')
                ->onDelete('set null');

            // Index pour les requêtes de ventes par client
            $table->index('client_id');
        });
    }

    public function down(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            $table->dropForeign(['client_id']);
            $table->dropColumn('client_id');
        });
    }
};
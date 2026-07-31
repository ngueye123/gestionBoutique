<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('depenses', function (Blueprint $table) {
            $table->unsignedBigInteger('caisse_id')->nullable()->after('utilisateur_id');
            $table->unsignedBigInteger('mouvement_caisse_id')->nullable()->after('caisse_id');

            $table->foreign('caisse_id')->references('id')->on('caisses')->onDelete('set null');
            $table->foreign('mouvement_caisse_id')->references('id')->on('mouvements_caisse')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('depenses', function (Blueprint $table) {
            $table->dropForeign(['caisse_id']);
            $table->dropForeign(['mouvement_caisse_id']);
            $table->dropColumn(['caisse_id', 'mouvement_caisse_id']);
        });
    }
};
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
        Schema::table('depenses', function (Blueprint $table) {
            $table->foreignId('employe_id')->nullable()->after('utilisateur_id')
                  ->constrained('employes')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('depenses', function (Blueprint $table) {
            $table->dropForeign(['employe_id']);
            $table->dropColumn('employe_id');
        });
    }
};

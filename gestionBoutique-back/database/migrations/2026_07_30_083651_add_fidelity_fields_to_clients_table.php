<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('numero_carte', 20)->nullable()->unique()->after('telephone');
            $table->unsignedInteger('solde_points')->default(0)->after('solde_dette');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['numero_carte', 'solde_points']);
        });
    }
};
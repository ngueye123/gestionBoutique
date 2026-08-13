<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('price_overrides', function (Blueprint $table) {
            $table->dropColumn('pin_utilise');
        });
    }

    public function down(): void
    {
        Schema::table('price_overrides', function (Blueprint $table) {
            $table->boolean('pin_utilise')->default(false)->after('justification');
        });
    }
};
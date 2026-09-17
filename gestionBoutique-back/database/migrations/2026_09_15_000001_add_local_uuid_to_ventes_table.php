<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventes', function (Blueprint $table): void {
            $table->string('local_uuid', 36)->nullable()->unique()->after('reference');
        });
    }

    public function down(): void
    {
        Schema::table('ventes', function (Blueprint $table): void {
            $table->dropUnique(['local_uuid']);
            $table->dropColumn('local_uuid');
        });
    }
};
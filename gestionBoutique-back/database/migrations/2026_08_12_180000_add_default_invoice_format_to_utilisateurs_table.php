<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            // Null = pas encore configuré -> le POS retombe sur "thermal" par défaut
            $table->enum('default_invoice_format', ['a4', 'thermal'])->nullable()->after('logo_boutique');
        });
    }

    public function down(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropColumn('default_invoice_format');
        });
    }
};

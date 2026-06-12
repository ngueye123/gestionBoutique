<?php
// database/migrations/2026_XX_XX_add_email_verification_to_employes_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employes', function (Blueprint $table) {
            // Timestamp de vérification, null = non vérifié
            $table->timestamp('email_verified_at')->nullable()->after('email');
            // Token à usage unique envoyé par email
            $table->string('verification_token', 100)->nullable()->after('email_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('employes', function (Blueprint $table) {
            $table->dropColumn(['email_verified_at', 'verification_token']);
        });
    }
};
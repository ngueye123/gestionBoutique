<?php
// database/migrations/2025_01_XX_add_email_verification_to_utilisateurs.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->timestamp('email_verified_at')->nullable()->after('email');
            $table->string('verification_token', 100)->nullable()->after('email_verified_at');
        });

        // Table pour reset password
        Schema::create('password_resets_utilisateurs', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropColumn(['email_verified_at', 'verification_token']);
        });

        Schema::dropIfExists('password_resets_utilisateurs');
    }
};
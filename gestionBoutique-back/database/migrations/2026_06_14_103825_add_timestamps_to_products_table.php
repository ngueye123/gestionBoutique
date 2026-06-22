// php artisan make:migration add_timestamps_to_products_table --table=products
<?php
// database/migrations/2026_XX_XX_add_email_verification_to_employes_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Ajout des timestamps avec valeur par défaut pour les lignes existantes
            $table->timestamp('created_at')->useCurrent()->nullable()->after('id');
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate()->nullable()->after('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropTimestamps();
        });
    }
};
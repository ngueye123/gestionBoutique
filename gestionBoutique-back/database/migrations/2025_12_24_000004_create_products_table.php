<?php
// database/migrations/xxxx_xx_xx_create_products_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 50);
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->integer('stock');
            $table->string('category');
            $table->integer('min_stock');
            $table->foreignId('utilisateur_id')->constrained('utilisateurs')->cascadeOnDelete();

            $table->unique(['reference', 'utilisateur_id'], 'unique_reference_per_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};

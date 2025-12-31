<?php
// database/migrations/xxxx_xx_xx_create_employes_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('employes', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('email')->unique();
            $table->string('mot_de_passe', 500);
            $table->enum('role', ['admin', 'vendeur', 'caissier'])->default('vendeur');
            $table->foreignId('utilisateur_id')->constrained('utilisateurs')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employes');
    }
};


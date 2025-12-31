<?php
// database/migrations/xxxx_xx_xx_create_utilisateurs_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('utilisateurs', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 50);
            $table->string('prenom', 50);
            $table->string('email', 50)->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('verification_token', 100)->nullable();
            $table->string('mot_de_passe', 500);
            $table->enum('role', ['admin', 'utilisateur'])->default('utilisateur');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('utilisateurs');
    }
};

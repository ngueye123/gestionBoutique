<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        
        Schema::create('security_settings', function (Blueprint $table) {
            $table->id();
            $table->string('pin_hash'); // jamais le PIN en clair
            $table->foreignId('updated_by')->constrained('utilisateurs'); // qui a mis à jour le PIN
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
       Schema::dropIfExists('security_settings');
    }
};

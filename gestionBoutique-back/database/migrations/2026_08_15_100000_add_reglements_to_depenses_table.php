<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('depenses', function (Blueprint $table) {
            $table->decimal('montant_regle', 12, 2)->default(0)->after('montant');
        });

        Schema::create('depense_reglements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depense_id')->constrained('depenses')->cascadeOnDelete();
            $table->foreignId('utilisateur_id')->constrained('utilisateurs')->cascadeOnDelete();
            $table->foreignId('employe_id')->nullable()->constrained('employes')->nullOnDelete();
            $table->foreignId('caisse_id')->nullable()->constrained('caisses')->nullOnDelete();
            $table->foreignId('mouvement_caisse_id')->nullable()->constrained('mouvements_caisse')->nullOnDelete();
            $table->decimal('montant', 12, 2);
            $table->string('moyen_paiement', 30)->default('especes');
            $table->string('note', 500)->nullable();
            $table->timestamps();

            $table->index(['depense_id', 'created_at']);
        });

        // Les dépenses existantes ont déjà été débitées intégralement.
        DB::table('depenses')->update(['montant_regle' => DB::raw('montant')]);
    }

    public function down(): void
    {
        Schema::dropIfExists('depense_reglements');

        Schema::table('depenses', function (Blueprint $table) {
            $table->dropColumn('montant_regle');
        });
    }
};

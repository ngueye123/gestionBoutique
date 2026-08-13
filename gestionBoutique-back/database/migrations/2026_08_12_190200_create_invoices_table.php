<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->unsignedInteger('amount_xof');
            $table->enum('status', ['pending', 'paid', 'failed', 'canceled'])->default('pending');
            $table->string('wave_checkout_id')->nullable()->unique();
            $table->string('wave_transaction_id')->nullable();
            $table->timestamp('due_date')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->unsignedTinyInteger('attempt_count')->default(0);
            $table->timestamps();

            $table->index(['subscription_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};

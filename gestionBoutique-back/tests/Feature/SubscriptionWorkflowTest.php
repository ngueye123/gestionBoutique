<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionStatusLog;
use App\Models\Utilisateur;
use Illuminate\Database\Schema\Blueprint;
use Carbon\Carbon;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SubscriptionWorkflowTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    protected function setUp(): void
    {
        parent::setUp();

        config(['jwt.secret' => 'test-secret']);

        Schema::dropIfExists('subscription_status_logs');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plans');
        Schema::dropIfExists('utilisateurs');

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

        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 100)->unique();
            $table->unsignedInteger('price_xof');
            $table->string('billing_interval', 20)->default('monthly');
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('boutique_id')->unique()->constrained('utilisateurs')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('plans')->restrictOnDelete();
            $table->enum('status', ['trialing', 'active', 'past_due', 'canceled', 'expired'])->default('trialing');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->timestamp('grace_period_ends_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamps();
        });

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
        });

        Schema::create('subscription_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->string('old_status', 20)->nullable();
            $table->string('new_status', 20);
            $table->string('cause', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    private function createBoutique(array $overrides = []): Utilisateur
    {
        return Utilisateur::create(array_merge([
            'nom' => 'Diallo',
            'prenom' => 'Awa',
            'email' => 'awa@example.com',
            'mot_de_passe' => 'password123',
            'role' => 'admin',
        ], $overrides));
    }

    private function createPlan(array $overrides = []): Plan
    {
        return Plan::create(array_merge([
            'name' => 'Standard',
            'slug' => 'standard',
            'price_xof' => 15000,
            'billing_interval' => 'monthly',
            'features' => ['ventes_illimitees'],
            'is_active' => true,
        ], $overrides));
    }

    public function test_subscription_status_methods_transition_and_log_changes(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-12 10:00:00'));

        $subscription = Subscription::create([
            'boutique_id' => $this->createBoutique()->id,
            'plan_id' => $this->createPlan()->id,
            'status' => Subscription::STATUS_TRIALING,
            'trial_ends_at' => now()->addDays(14),
        ]);

        $subscription->markAsActive(now(), now()->addMonth(), 'webhook_payment_confirmed');
        $subscription->markAsPastDue('manual_test');
        $subscription->markAsExpired('grace_period_expired');

        $subscription->refresh();

        $this->assertSame(Subscription::STATUS_EXPIRED, $subscription->status);
        $this->assertNotNull($subscription->grace_period_ends_at);
        $this->assertTrue($subscription->grace_period_ends_at->equalTo(now()->addDays(3)));
        $this->assertDatabaseCount('subscription_status_logs', 3);
        $this->assertDatabaseHas('subscription_status_logs', [
            'subscription_id' => $subscription->id,
            'old_status' => Subscription::STATUS_TRIALING,
            'new_status' => Subscription::STATUS_ACTIVE,
            'cause' => 'webhook_payment_confirmed',
        ]);
    }

    public function test_subscription_access_middleware_adds_warning_header_for_past_due(): void
    {
        $boutique = $this->createBoutique(['email' => 'pastdue@example.com']);
        $plan = $this->createPlan(['slug' => 'pro']);

        Subscription::create([
            'boutique_id' => $boutique->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_PAST_DUE,
            'trial_ends_at' => now()->subDays(1),
            'current_period_end' => now()->subDay(),
            'grace_period_ends_at' => now()->addDays(2),
        ]);

        Route::middleware(['subscription.access'])->get('/test/subscription-access', function () {
            return response()->json(['ok' => true]);
        });

        $response = $this->actingAs($boutique, 'api')->getJson('/test/subscription-access');

        $response->assertOk();
        $response->assertHeader('X-Subscription-Warning', 'past_due');
    }

    public function test_wave_webhook_is_idempotent_and_activates_subscription_once(): void
    {
        config(['services.wave.webhook_secret' => 'secret-token']);

        $boutique = $this->createBoutique(['email' => 'wave@example.com']);
        $plan = $this->createPlan(['slug' => 'wave-plan']);
        $subscription = Subscription::create([
            'boutique_id' => $boutique->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_TRIALING,
            'trial_ends_at' => now()->addDays(1),
        ]);

        $invoice = Invoice::create([
            'subscription_id' => $subscription->id,
            'amount_xof' => 15000,
            'status' => Invoice::STATUS_PENDING,
            'wave_checkout_id' => 'cos_test_123',
            'due_date' => now(),
        ]);

        $payload = [
            'data' => [
                'id' => 'cos_test_123',
                'checkout_status' => 'complete',
                'payment_status' => 'succeeded',
                'transaction_id' => 'txn_456',
            ],
        ];

        $response = $this->postJson('/api/wave/webhook', $payload, [
            'Wave-Signature' => $this->waveSignature($payload, 'secret-token'),
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'status' => Invoice::STATUS_PAID,
            'wave_transaction_id' => 'txn_456',
        ]);
        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscription->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $secondResponse = $this->postJson('/api/wave/webhook', $payload, [
            'Wave-Signature' => $this->waveSignature($payload, 'secret-token'),
        ]);

        $secondResponse->assertOk();
        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseCount('subscription_status_logs', 1);
    }

    public function test_wave_webhook_rejects_invalid_signature(): void
    {
        config(['services.wave.webhook_secret' => 'secret-token']);

        $boutique = $this->createBoutique(['email' => 'invalid-sig@example.com']);
        $plan = $this->createPlan(['slug' => 'invalid-plan']);
        $subscription = Subscription::create([
            'boutique_id' => $boutique->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_TRIALING,
            'trial_ends_at' => now()->addDays(1),
        ]);

        Invoice::create([
            'subscription_id' => $subscription->id,
            'amount_xof' => 15000,
            'status' => Invoice::STATUS_PENDING,
            'wave_checkout_id' => 'cos_invalid_sig',
            'due_date' => now(),
        ]);

        $payload = [
            'data' => [
                'id' => 'cos_invalid_sig',
                'checkout_status' => 'complete',
                'payment_status' => 'succeeded',
                'transaction_id' => 'txn_invalid',
            ],
        ];

        $response = $this->postJson('/api/wave/webhook', $payload, [
            'Wave-Signature' => 't=' . time() . ',v1=invalid-signature',
        ]);

        $response->assertUnauthorized();
        $this->assertDatabaseHas('invoices', [
            'wave_checkout_id' => 'cos_invalid_sig',
            'status' => Invoice::STATUS_PENDING,
        ]);
    }

    private function waveSignature(array $payload, string $secret): string
    {
        $timestamp = (string) time();
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);

        return 't=' . $timestamp . ',v1=' . hash_hmac('sha256', $timestamp . $body, $secret);
    }
}

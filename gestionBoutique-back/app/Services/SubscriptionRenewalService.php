<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Subscription;
use App\Notifications\PaymentFailedNotification;
use App\Notifications\SubscriptionExpiredNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class SubscriptionRenewalService
{
    public function __construct(private readonly WavePaymentService $wavePaymentService)
    {
    }

    /**
     * Traite quotidiennement les transitions de statut liées à l'expiration :
     * - active + période courante dépassée      -> past_due (grâce de 3 jours) + tentative de relance
     * - past_due + période de grâce dépassée     -> expired + notification
     * - trialing + essai dépassé                 -> expired + notification
     *
     * @return array{active_to_past_due: int, past_due_to_expired: int, trialing_to_expired: int}
     */
    public function processExpiredSubscriptions(): array
    {
        return [
            'active_to_past_due'  => $this->processActiveToPastDue(),
            'past_due_to_expired' => $this->processPastDueToExpired(),
            'trialing_to_expired' => $this->processTrialingToExpired(),
        ];
    }

    private function processActiveToPastDue(): int
    {
        $count = 0;

        Subscription::where('status', Subscription::STATUS_ACTIVE)
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<', now())
            ->orderBy('id')
            ->chunkById(100, function ($subscriptions) use (&$count) {
                foreach ($subscriptions as $subscription) {
                    DB::transaction(function () use ($subscription) {
                        $locked = Subscription::lockForUpdate()->find($subscription->id);
                        if ($locked === null || $locked->status !== Subscription::STATUS_ACTIVE) {
                            return;
                        }

                        $locked->markAsPastDue('periode_courante_expiree');
                        $this->attemptDunningInvoice($locked);
                    });
                    $count++;
                }
            });

        return $count;
    }

    private function processPastDueToExpired(): int
    {
        $count = 0;

        Subscription::where('status', Subscription::STATUS_PAST_DUE)
            ->whereNotNull('grace_period_ends_at')
            ->where('grace_period_ends_at', '<', now())
            ->orderBy('id')
            ->chunkById(100, function ($subscriptions) use (&$count) {
                foreach ($subscriptions as $subscription) {
                    DB::transaction(function () use ($subscription) {
                        $locked = Subscription::lockForUpdate()->find($subscription->id);
                        if ($locked === null || $locked->status !== Subscription::STATUS_PAST_DUE) {
                            return;
                        }

                        $locked->markAsExpired('periode_grace_expiree');

                        if ($locked->boutique !== null) {
                            $locked->boutique->notify(new SubscriptionExpiredNotification('periode_grace_expiree'));
                        }
                    });
                    $count++;
                }
            });

        return $count;
    }

    private function processTrialingToExpired(): int
    {
        $count = 0;

        Subscription::where('status', Subscription::STATUS_TRIALING)
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<', now())
            ->orderBy('id')
            ->chunkById(100, function ($subscriptions) use (&$count) {
                foreach ($subscriptions as $subscription) {
                    DB::transaction(function () use ($subscription) {
                        $locked = Subscription::lockForUpdate()->find($subscription->id);
                        if ($locked === null || $locked->status !== Subscription::STATUS_TRIALING) {
                            return;
                        }

                        $locked->markAsExpired('essai_termine');

                        if ($locked->boutique !== null) {
                            $locked->boutique->notify(new SubscriptionExpiredNotification('essai_termine'));
                        }
                    });
                    $count++;
                }
            });

        return $count;
    }

    /**
     * Tentative de relance (dunning) : génère une nouvelle facture et une session de paiement Wave,
     * dans la limite de Invoice::MAX_ATTEMPTS. Les échecs (ex: API Wave indisponible) sont
     * capturés et logués sans interrompre le traitement du lot.
     */
    private function attemptDunningInvoice(Subscription $subscription): void
    {
        $lastInvoice = $subscription->invoices()->latest('id')->first();

        if ($lastInvoice !== null && $lastInvoice->hasReachedMaxAttempts()) {
            return;
        }

        try {
            $invoice = Invoice::create([
                'subscription_id' => $subscription->id,
                'amount_xof'      => $subscription->plan->price_xof,
                'status'          => Invoice::STATUS_PENDING,
                'due_date'        => now(),
                'attempt_count'   => $lastInvoice !== null ? $lastInvoice->attempt_count : 0,
            ]);

            $this->wavePaymentService->createCheckoutSession($invoice);

            if ($subscription->boutique !== null) {
                $graceDaysRemaining = $subscription->grace_period_ends_at !== null
                    ? max(0, (int) now()->diffInDays($subscription->grace_period_ends_at, false))
                    : 0;

                $subscription->boutique->notify(new PaymentFailedNotification($graceDaysRemaining));
            }
        } catch (Throwable $e) {
            Log::error('Relance (dunning) Wave échouée pour abonnement #' . $subscription->id . ': ' . $e->getMessage());
        }
    }
}

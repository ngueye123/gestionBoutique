<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Utilisateur;
use App\Notifications\TrialEndingSoonNotification;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SubscriptionService
{
    /** Durée de l'essai gratuit, en jours. */
    private const TRIAL_DAYS = 14;

    /** Jours avant la fin de l'essai auxquels une relance est envoyée. */
    private const REMINDER_DAYS = [3, 1];

    /**
     * Crée l'abonnement d'essai gratuit d'une boutique fraîchement inscrite.
     * Aucune donnée de paiement n'est requise à ce stade.
     */
    public function registerTrial(Utilisateur $boutique, ?string $planSlug = null): Subscription
    {
        return DB::transaction(function () use ($boutique, $planSlug) {
            // Une boutique ne peut avoir qu'un seul abonnement (contrainte unique sur boutique_id).
            $existing = Subscription::where('boutique_id', $boutique->id)->first();
            if ($existing !== null) {
                return $existing;
            }

            $plan = $planSlug !== null
                ? Plan::where('slug', $planSlug)->where('is_active', true)->first()
                : Plan::where('is_active', true)->orderBy('price_xof')->first();

            if ($plan === null) {
                throw new RuntimeException(
                    'Aucun plan actif disponible pour créer un abonnement d\'essai. '
                    . 'Exécutez le seeder PlanSeeder ou créez un plan via /plans.'
                );
            }

            $subscription = Subscription::create([
                'boutique_id'   => $boutique->id,
                'plan_id'       => $plan->id,
                'status'        => Subscription::STATUS_TRIALING,
                'trial_ends_at' => now()->addDays(self::TRIAL_DAYS),
            ]);

            $subscription->statusLogs()->create([
                'old_status' => null,
                'new_status' => Subscription::STATUS_TRIALING,
                'cause'      => 'inscription_essai_gratuit',
            ]);

            return $subscription;
        });
    }

    /**
     * Envoie les notifications J-3 / J-1 aux boutiques dont l'essai se termine bientôt.
     * Destiné à être appelé quotidiennement par le scheduler.
     */
    public function sendTrialReminders(): int
    {
        $notified = 0;

        foreach (self::REMINDER_DAYS as $daysRemaining) {
            $targetDate = now()->addDays($daysRemaining)->toDateString();

            $subscriptions = Subscription::query()
                ->where('status', Subscription::STATUS_TRIALING)
                ->whereNotNull('trial_ends_at')
                ->whereDate('trial_ends_at', $targetDate)
                ->with('boutique')
                ->get();

            foreach ($subscriptions as $subscription) {
                if ($subscription->boutique === null) {
                    continue;
                }

                $subscription->boutique->notify(new TrialEndingSoonNotification($daysRemaining));
                $notified++;
            }
        }

        return $notified;
    }
}

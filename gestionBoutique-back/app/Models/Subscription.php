<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Subscription extends Model
{
    public const STATUS_TRIALING = 'trialing';
    public const STATUS_ACTIVE   = 'active';
    public const STATUS_PAST_DUE = 'past_due';
    public const STATUS_CANCELED = 'canceled';
    public const STATUS_EXPIRED  = 'expired';

    /** Statuts qui donnent encore accès à l'application (past_due = période de grâce). */
    private const ACCESS_ALLOWED_STATUSES = [
        self::STATUS_TRIALING,
        self::STATUS_ACTIVE,
        self::STATUS_PAST_DUE,
    ];

    protected $fillable = [
        'boutique_id',
        'plan_id',
        'status',
        'trial_ends_at',
        'current_period_start',
        'current_period_end',
        'grace_period_ends_at',
        'canceled_at',
    ];

    protected $casts = [
        'trial_ends_at'         => 'datetime',
        'current_period_start'  => 'datetime',
        'current_period_end'    => 'datetime',
        'grace_period_ends_at'  => 'datetime',
        'canceled_at'           => 'datetime',
    ];

    public function boutique(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'boutique_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(SubscriptionStatusLog::class);
    }

    /**
     * L'abonnement donne-t-il encore accès à l'application ?
     * (past_due = période de grâce, toujours autorisé, avec avertissement)
     */
    public function isAccessAllowed(): bool
    {
        return in_array($this->status, self::ACCESS_ALLOWED_STATUSES, true);
    }

    public function isTrialExpired(): bool
    {
        return $this->status === self::STATUS_TRIALING
            && $this->trial_ends_at !== null
            && $this->trial_ends_at->isPast();
    }

    public function isCurrentPeriodExpired(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && $this->current_period_end !== null
            && $this->current_period_end->isPast();
    }

    public function isGracePeriodExpired(): bool
    {
        return $this->status === self::STATUS_PAST_DUE
            && $this->grace_period_ends_at !== null
            && $this->grace_period_ends_at->isPast();
    }

    /**
     * Active l'abonnement pour une nouvelle période (paiement confirmé par webhook).
     */
    public function markAsActive(?Carbon $periodStart = null, ?Carbon $periodEnd = null, string $cause = 'paiement_confirme'): void
    {
        $this->transitionTo(self::STATUS_ACTIVE, $cause, [
            'current_period_start' => $periodStart ?? now(),
            'current_period_end'   => $periodEnd ?? now()->addMonth(),
            'grace_period_ends_at' => null,
        ]);
    }

    /**
     * Passe l'abonnement en impayé, avec une période de grâce de 3 jours.
     */
    public function markAsPastDue(string $cause = 'periode_courante_expiree'): void
    {
        $this->transitionTo(self::STATUS_PAST_DUE, $cause, [
            'grace_period_ends_at' => now()->addDays(3),
        ]);
    }

    /**
     * Expire définitivement l'abonnement (essai ou période de grâce dépassés).
     */
    public function markAsExpired(string $cause): void
    {
        $this->transitionTo(self::STATUS_EXPIRED, $cause);
    }

    /**
     * Annulation volontaire par le patron.
     */
    public function markAsCanceled(string $cause = 'annulation_utilisateur'): void
    {
        $this->transitionTo(self::STATUS_CANCELED, $cause, [
            'canceled_at' => now(),
        ]);
    }

    /**
     * Seule méthode qui modifie `status` — garantit qu'un log est écrit à chaque transition.
     */
    private function transitionTo(string $newStatus, string $cause, array $extra = []): void
    {
        $oldStatus = $this->status;

        $this->fill(array_merge(['status' => $newStatus], $extra));
        $this->save();

        $this->statusLogs()->create([
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'cause'      => $cause,
        ]);
    }
}

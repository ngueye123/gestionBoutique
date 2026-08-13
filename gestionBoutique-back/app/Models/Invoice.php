<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    public const STATUS_PENDING  = 'pending';
    public const STATUS_PAID     = 'paid';
    public const STATUS_FAILED   = 'failed';
    public const STATUS_CANCELED = 'canceled';

    /** Nombre maximum de tentatives de relance (dunning) avant expiration définitive. */
    public const MAX_ATTEMPTS = 3;

    protected $fillable = [
        'subscription_id',
        'amount_xof',
        'status',
        'wave_checkout_id',
        'wave_transaction_id',
        'due_date',
        'paid_at',
        'attempt_count',
    ];

    protected $casts = [
        'amount_xof'    => 'integer',
        'due_date'      => 'datetime',
        'paid_at'       => 'datetime',
        'attempt_count' => 'integer',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    public function markAsPaid(?string $waveTransactionId = null): void
    {
        $this->update([
            'status'               => self::STATUS_PAID,
            'paid_at'              => now(),
            'wave_transaction_id'  => $waveTransactionId ?? $this->wave_transaction_id,
        ]);
    }

    public function markAsFailed(): void
    {
        $this->update([
            'status'        => self::STATUS_FAILED,
            'attempt_count' => $this->attempt_count + 1,
        ]);
    }

    public function hasReachedMaxAttempts(): bool
    {
        return $this->attempt_count >= self::MAX_ATTEMPTS;
    }
}

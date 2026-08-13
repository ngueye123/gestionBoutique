<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionStatusLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'subscription_id',
        'old_status',
        'new_status',
        'cause',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}

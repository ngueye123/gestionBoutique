<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'price_xof',
        'billing_interval',
        'features',
        'is_active',
    ];

    protected $casts = [
        'features'  => 'array',
        'is_active' => 'boolean',
        'price_xof' => 'integer',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}

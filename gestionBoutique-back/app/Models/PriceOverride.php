<?php
// app/Models/PriceOverride.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriceOverride extends Model
{
    protected $fillable = [
        'vente_id',
        'vente_detail_id',
        'product_id',
        'utilisateur_id',
        'employe_id',
        'prix_normal',
        'prix_applique',
        'justification',
        'ip_address',
    ];

    protected $casts = [
        'prix_normal'   => 'decimal:2',
        'prix_applique' => 'decimal:2',
    ];

    public function vente(): BelongsTo
    {
        return $this->belongsTo(Vente::class);
    }

    public function venteDetail(): BelongsTo
    {
        return $this->belongsTo(VenteDetail::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class);
    }

    public function employe(): BelongsTo
    {
        return $this->belongsTo(Employe::class);
    }
}
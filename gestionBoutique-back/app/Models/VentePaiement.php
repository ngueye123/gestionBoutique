<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentePaiement extends Model
{
    protected $table = 'vente_paiements';

    protected $fillable = [
        'vente_id',
        'mode',
        'montant',
        'montant_recu',
        'monnaie_rendue',
        'reference_transaction',
        'client_id',
    ];

    protected $casts = [
        'montant'         => 'decimal:2',
        'montant_recu'    => 'decimal:2',
        'monnaie_rendue'  => 'decimal:2',
    ];

    public function vente(): BelongsTo
    {
        return $this->belongsTo(Vente::class, 'vente_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }
}
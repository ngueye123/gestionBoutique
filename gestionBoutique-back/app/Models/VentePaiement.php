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
        'montant'         => 'integer',
        'montant_recu'    => 'integer',
        'monnaie_rendue'  => 'integer',
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
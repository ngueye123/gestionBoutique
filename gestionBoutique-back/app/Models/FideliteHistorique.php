<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FideliteHistorique extends Model
{
    protected $table = 'fidelite_historiques';

    protected $fillable = [
        'client_id', 'utilisateur_id', 'mois', 'annee',
        'montant_achat_total', 'points_total', 'est_consomme',
        'consomme_par', 'consomme_at',
    ];

    protected $casts = [
        'mois'                 => 'integer',
        'annee'                => 'integer',
        'montant_achat_total'  => 'integer',
        'points_total'         => 'integer',
        'est_consomme'         => 'boolean',
        'consomme_at'          => 'datetime',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }
}
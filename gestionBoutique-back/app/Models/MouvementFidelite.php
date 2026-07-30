<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MouvementFidelite extends Model
{
    protected $table = 'mouvements_fidelite';

    protected $fillable = [
        'client_id', 'utilisateur_id', 'type', 'source_id',
        'montant_reference', 'points', 'solde_avant', 'solde_apres',
    ];

    protected $casts = [
        'montant_reference' => 'integer',
        'points'            => 'integer',
        'solde_avant'       => 'integer',
        'solde_apres'       => 'integer',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function scopeByClient($query, int $clientId)
    {
        return $query->where('client_id', $clientId);
    }
}
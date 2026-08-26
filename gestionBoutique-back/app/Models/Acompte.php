<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Acompte extends Model
{
    protected $table = 'acomptes';

    protected $fillable = [
        'client_id',
        'utilisateur_id',
        'employe_id',
        'montant',
        'moyen_paiement',
        'note',
    ];

    protected $casts = [
        'montant' => 'integer',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function employe(): BelongsTo
    {
        return $this->belongsTo(Employe::class);
    }
}
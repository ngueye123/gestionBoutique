<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepenseReglement extends Model
{
    protected $table = 'depense_reglements';

    protected $fillable = [
        'depense_id',
        'utilisateur_id',
        'employe_id',
        'caisse_id',
        'mouvement_caisse_id',
        'montant',
        'moyen_paiement',
        'note',
    ];

    protected $casts = [
        'montant' => 'decimal:2',
    ];

    public function depense(): BelongsTo
    {
        return $this->belongsTo(Depense::class);
    }

    public function employe(): BelongsTo
    {
        return $this->belongsTo(Employe::class);
    }

    public function caisse(): BelongsTo
    {
        return $this->belongsTo(Caisse::class);
    }

    public function mouvementCaisse(): BelongsTo
    {
        return $this->belongsTo(MouvementCaisse::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FideliteSetting extends Model
{
    protected $table = 'fidelite_settings';

    protected $fillable = ['utilisateur_id', 'montant_tranche', 'points_accordes', 'updated_by'];

    protected $casts = [
        'montant_tranche' => 'integer',
        'points_accordes' => 'integer',
    ];

    /**
     * Retourne la config du patron, ou une config "neutre" (0 point) si absente.
     * Ne lève jamais d'exception — cf. contrôle C9.
     */
    public static function forOwner(int $ownerId): self
    {
        return static::where('utilisateur_id', $ownerId)->first()
            ?? new self(['utilisateur_id' => $ownerId, 'montant_tranche' => 0, 'points_accordes' => 0]);
    }
}
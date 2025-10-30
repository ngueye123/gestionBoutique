<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vente extends Model
{
    protected $table = 'ventes';
    public $timestamps = false;
    protected $fillable = [
        'reference',
        'utilisateur_id',
        'employe_id',
        'total',
        'moyen_paiement',
        'montant_recu',
        'monnaie',
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'montant_recu' => 'decimal:2',
        'monnaie' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relation avec les détails de vente
     */
    public function details(): HasMany
    {
        return $this->hasMany(VenteDetail::class, 'vente_id');
    }

    /**
     * Relation avec l'utilisateur (patron)
     */
    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }

    /**
     * Relation avec l'employé (optionnel)
     */
    public function employe(): BelongsTo
    {
        return $this->belongsTo(Employe::class, 'employe_id');
    }

    /**
     * Générer une référence unique pour la vente
     */
    public static function generateReference(): string
    {
        $date = now()->format('Ymd');
        $count = self::whereDate('created_at', today())->count() + 1;
        return 'VT-' . $date . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Scope pour filtrer par utilisateur
     */
    public function scopeByUtilisateur($query, int $utilisateurId)
    {
        return $query->where('utilisateur_id', $utilisateurId);
    }

    /**
     * Scope pour filtrer par date
     */
    public function scopeByDate($query, $date)
    {
        return $query->whereDate('created_at', $date);
    }

    /**
     * Scope pour filtrer par période
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }
}
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
        'client_id', // ← AJOUT pour les ventes à crédit
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
     * Relation avec le client (pour ventes à crédit)
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    /**
     * Lignes de paiement de la vente (split payment)
     */
    public function paiements(): HasMany
    {
        return $this->hasMany(VentePaiement::class, 'vente_id');
    }

    /**
     * Vérifier si c'est une vente à crédit
     */
    public function estVenteACredit(): bool
    {
        return $this->moyen_paiement === 'dette' && $this->client_id !== null;
    }

    /**
     * Générer une référence unique pour la vente
     */
   /**
 * Générer une référence unique pour la vente
 */
    public static function generateReference(): string
    {
        $date = now()->format('Ymd');
        $cle  = "vente_{$date}"; // une séquence différente chaque jour

        // Sequence::next() est atomique — garantit l'unicité même en cas
        // de ventes parfaitement simultanées
        $count = Sequence::next($cle);

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

    /**
     * Scope pour les ventes à crédit uniquement
     */
    public function scopeVentesCredit($query)
    {
        return $query->where('moyen_paiement', 'dette')
                     ->whereNotNull('client_id');
    }
}

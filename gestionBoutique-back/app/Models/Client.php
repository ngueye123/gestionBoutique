<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $table = 'clients';
    
    protected $fillable = [
        'nom',
        'telephone',
        'utilisateur_id',
        'solde_dette',
    ];

    protected $casts = [
        'solde_dette' => 'decimal:2',
    ];

    /**
     * Relation avec le patron propriétaire
     */
    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }

    /**
     * Relation avec les ventes à crédit
     */
    public function ventes(): HasMany
    {
        return $this->hasMany(Vente::class, 'client_id');
    }

    /**
     * Relation avec les remboursements
     */
    public function remboursements(): HasMany
    {
        return $this->hasMany(Remboursement::class, 'client_id');
    }

    /**
     * Ajouter une dette au solde
     */
    public function ajouterDette(float $montant): void
    {
        $this->increment('solde_dette', $montant);
    }

    /**
     * Réduire la dette (lors d'un remboursement)
     */
    public function reduireDette(float $montant): void
    {
        $nouveauSolde = max(0, $this->solde_dette - $montant);
        $this->update(['solde_dette' => $nouveauSolde]);
    }

    /**
     * Vérifier si le client a des dettes
     */
    public function aDette(): bool
    {
        return $this->solde_dette > 0;
    }

    /**
     * Scope pour filtrer par utilisateur
     */
    public function scopeByUtilisateur($query, int $utilisateurId)
    {
        return $query->where('utilisateur_id', $utilisateurId);
    }

    /**
     * Scope pour rechercher par nom ou téléphone
     */
    public function scopeSearch($query, string $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('nom', 'LIKE', "%{$search}%")
              ->orWhere('telephone', 'LIKE', "%{$search}%");
        });
    }

    /**
     * Scope pour les clients avec dettes
     */
    public function scopeAvecDettes($query)
    {
        return $query->where('solde_dette', '>', 0);
    }
}
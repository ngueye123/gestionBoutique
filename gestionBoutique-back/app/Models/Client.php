<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
class Client extends Model
{
    protected $table = 'clients';
    
    protected $fillable = [
        'nom',
        'telephone',
        'numero_carte',  
        'solde_points',
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
     * Relation avec les acomptes versés par le client.
     */
    public function acomptes(): HasMany
    {
        return $this->hasMany(Acompte::class, 'client_id');
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
     * Enregistre un acompte : un solde négatif représente le crédit disponible.
     */
    public function ajouterAcompte(float $montant): void
    {
        $this->decrement('solde_dette', $montant);
    }

    /**
     * Consomme le crédit disponible lors d'une vente.
     */
    public function consommerAcompte(float $montant): void
    {
        $this->increment('solde_dette', $montant);
    }

    /**
     * Crédite les points de fidélité sur le solde du client.
     */
    public function crediterPoints(int $points): void
    {
        if ($points > 0) {
            $this->increment('solde_points', $points);
        }
    }

    /**
     * Génère un numéro de carte fidélité si absent (FID-{id}).
     */
    public function genererNumeroCarteSiAbsent(): void
    {
        if (empty($this->numero_carte)) {
            $this->update(['numero_carte' => 'FID-' . str_pad((string) $this->id, 6, '0', STR_PAD_LEFT)]);
        }
    }

    protected static function booted()
    {
        static::created(function (Client $client) {
            if (empty($client->numero_carte)) {
                
                // 1. Extraire les 3 premières lettres du nom
                // Str::slug enlève les accents et espaces, Str::upper met en majuscule
                $nomPropre = Str::upper(substr(Str::slug($client->nom, ''), 0, 3));
                
                // Sécurité : si le nom fait moins de 3 lettres (ex: "Ly"), on comble avec des "X"
                $prefixNom = str_pad($nomPropre, 3, 'X');

                // 2. Les 2 derniers chiffres du téléphone
                $finTelephone = substr($client->telephone, -2);
                // Sécurité : si le téléphone est absent ou trop court, on met "00"
                $finTelephone = str_pad($finTelephone, 2, '0', STR_PAD_LEFT);

                // 3. L'ID du client formaté sur 4 chiffres (ex: 0042)
                $idFormat = str_pad((string) $client->id, 4, '0', STR_PAD_LEFT);

                // 4. Assemblage final
                $client->numero_carte = "{$prefixNom}-{$finTelephone}-{$idFormat}";
                
                // Sauvegarde de la modification
                $client->save();
            }
        });
    }

    public function fideliteHistoriques(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(FideliteHistorique::class);
    }

    /**
     * Vérifier si le client a des dettes
     */
    public function aDette(): bool
    {
        return $this->solde_dette > 0;
    }

    /**
     * Vérifier si le client possède un acompte disponible.
     */
    public function aAcompte(): bool
    {
        return $this->solde_dette < 0;
    }

    /**
     * Montant d'acompte disponible, toujours positif.
     */
    public function acompteDisponible(): float
    {
        return max(0, -(float) $this->solde_dette);
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

    /**
     * Scope pour les clients avec acompte disponible.
     */
    public function scopeAvecAcomptes($query)
    {
        return $query->where('solde_dette', '<', 0);
    }
}
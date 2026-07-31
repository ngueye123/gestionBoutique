<?php
// app/Models/Depense.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Depense extends Model
{
    protected $table = 'depenses';

   protected $fillable = [
        'utilisateur_id',
        'caisse_id',
        'mouvement_caisse_id',
        'montant',
        'date_depense',
        'description',
        'categorie',
    ];

    protected $casts = [
        'montant'      => 'decimal:2',
        'date_depense' => 'date',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
    ];

    // ─── Relations ──────────────────────────────────────────────────────────

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }

    public function caisse(): BelongsTo
    {
        return $this->belongsTo(Caisse::class);
    }

    public function mouvementCaisse(): BelongsTo
    {
        return $this->belongsTo(MouvementCaisse::class);
    }

    // ─── Scopes ─────────────────────────────────────────────────────────────

    public function scopeByUtilisateur($query, int $utilisateurId)
    {
        return $query->where('utilisateur_id', $utilisateurId);
    }

    public function scopeParMois($query, int $mois, int $annee)
    {
        return $query
            ->whereMonth('date_depense', $mois)
            ->whereYear('date_depense', $annee);
    }

    public function scopeParAnnee($query, int $annee)
    {
        return $query->whereYear('date_depense', $annee);
    }

    public function scopeParPeriode($query, string $debut, string $fin)
    {
        return $query->whereBetween('date_depense', [$debut, $fin]);
    }

    public function scopeParCategorie($query, string $categorie)
    {
        return $query->where('categorie', $categorie);
    }

    // ─── Constantes ─────────────────────────────────────────────────────────

    public const CATEGORIES = [
        'loyer'          => 'Loyer',
        'salaires'       => 'Salaires',
        'electricite'    => 'Électricité / Eau',
        'transport'      => 'Transport',
        'fournitures'    => 'Fournitures',
        'maintenance'    => 'Maintenance',
        'communication'  => 'Communication',
        'impots'         => 'Impôts / Taxes',
        'autre'          => 'Autre',
    ];
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MouvementCaisse extends Model
{
    protected $table = 'mouvements_caisse';

    protected $fillable = [
        'caisse_id',
        'utilisateur_id',
        'type',
        'montant',
        'solde_avant',
        'solde_apres',
        'vente_id',
        'note',
        'ticket_reference',
    ];

    protected $casts = [
        'montant'     => 'decimal:2',
        'solde_avant' => 'decimal:2',
        'solde_apres' => 'decimal:2',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    // ──────────────────────────────────────────
    // Relations
    // ──────────────────────────────────────────

    public function caisse(): BelongsTo
    {
        return $this->belongsTo(Caisse::class, 'caisse_id');
    }

    public function vente(): BelongsTo
    {
        return $this->belongsTo(Vente::class, 'vente_id');
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }

    // ──────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────

    public function scopeByUtilisateur($query, int $utilisateurId)
    {
        return $query->where('utilisateur_id', $utilisateurId);
    }

    public function scopeByCaisse($query, int $caisseId)
    {
        return $query->where('caisse_id', $caisseId);
    }

    public function scopePrelevements($query)
    {
        return $query->where('type', 'prelevement');
    }

    public function scopeBetweenDates($query, $start, $end)
    {
        return $query->whereBetween('created_at', [$start, $end]);
    }

    // ──────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────

    /**
     * Indique si c'est une entrée (+) ou une sortie (-) dans la caisse.
     */
    public function estEntree(): bool
    {
        return in_array($this->type, ['vente', 'apport', 'remboursement_dette', 'acompte_client', 'ajustement_depense']);
    }

    /**
     * Retourne le signe du mouvement pour l'affichage.
     */
    public function signe(): string
    {
        return $this->estEntree() ? '+' : '-';
    }
}
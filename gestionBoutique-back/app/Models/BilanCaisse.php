<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BilanCaisse extends Model
{
    protected $table = 'bilans_caisse';

    protected $fillable = [
        'caisse_id',
        'utilisateur_id',
        'date_debut',
        'date_fin',
        'solde_debut',
        'total_entrees',
        'total_sorties',
        'solde_theorique',
        'solde_reel',
        'ecart',
        'nombre_ventes',
        'nombre_remboursements',
        'nombre_prelevements',
        'statut_ecart',
        'ticket_reference',
        'effectue_par',
    ];

    protected $casts = [
        'date_debut'      => 'date',
        'date_fin'        => 'date',
        'solde_debut'     => 'float',
        'total_entrees'   => 'float',
        'total_sorties'   => 'float',
        'solde_theorique' => 'float',
        'solde_reel'      => 'float',
        'ecart'           => 'float',
    ];

    public function caisse(): BelongsTo
    {
        return $this->belongsTo(Caisse::class);
    }

    public function caisseavec(): BelongsTo
    {
        return $this->belongsTo(Caisse::class, 'caisse_id')->with('employe');
    }
}
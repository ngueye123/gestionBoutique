<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VenteDetail extends Model
{
    protected $table = 'ventes_details';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'vente_id',
        'product_id',
        'reference_produit',
        'nom_produit',
        'quantite',
        'prix_unitaire',
        'sous_total'
    ];

    // Relation avec la vente parente
    public function vente()
    {
        return $this->belongsTo(Vente::class, 'vente_id');
    }

    // Relation avec le produit
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
    
    // Hook pour calculer automatiquement le sous-total avant la sauvegarde
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($venteDetail) {
            $venteDetail->sous_total = $venteDetail->quantite * $venteDetail->prix_unitaire;
        });

        static::updating(function ($venteDetail) {
            $venteDetail->sous_total = $venteDetail->quantite * $venteDetail->prix_unitaire;
        });
    }
}
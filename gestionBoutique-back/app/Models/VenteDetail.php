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
        'unite_vente',
        'quantite_base',
        'prix_unitaire',
        'unite_prix',
        'sous_total',
        'prix_original',
        'prix_override',
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
    
   
   
}
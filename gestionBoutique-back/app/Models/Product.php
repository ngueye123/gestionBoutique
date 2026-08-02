<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
class Product extends Model
{
    use HasFactory;
    use HasFactory, SoftDeletes; 
    protected $table = 'products';
    protected $primaryKey = 'id';

    protected $fillable = [
        'reference',
        'name',
        'price',
        'prix_achat',
        'stock',
        'category',
        'min_stock',
        'unit_type',
        'unit_reference',
        'utilisateur_id'
    ];
    protected $casts = [
        'reference' => 'string',
        'price' => 'float',
        'prix_achat' => 'float',
        'stock' => 'integer',
        'min_stock' => 'integer'
    ];

    public function utilisateur(){
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }
}
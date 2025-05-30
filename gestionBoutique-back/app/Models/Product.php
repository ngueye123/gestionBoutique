<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;

    protected $table = 'products';
    protected $primaryKey = 'reference';
    public $timestamps = false;

    protected $fillable = [
        'reference', 'name', 'price', 'stock', 'category', 'min_stock', 'utilisateur_id'
    ];
    protected $casts = [
        'reference' => 'string',
        'price' => 'float',
        'stock' => 'integer',
        'min_stock' => 'integer'
    ];

    public function utilisateur(){
        return $this->belongsTo(Utilisateur::class, 'id_utilisateur');
    }
}
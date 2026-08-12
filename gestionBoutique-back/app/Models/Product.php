<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
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

    public static function generateReference(string $name, ?int $id = null): string
    {
        // 1. Nettoyer le nom pour ne garder que les lettres et extraire les 3 premières
        $cleanName = preg_replace('/[^a-zA-Z]/', '', Str::slug($name, ''));
        $prefix = Str::upper(substr($cleanName, 0, 3));

        // 2. Si le nom est trop court (ex: "Dé"), on complète avec des 'X'
        if (strlen($prefix) < 3) {
            $prefix = str_pad($prefix, 3, 'X');
        }
        
        // Fallback ultime si le nom ne contenait aucune lettre
        if ($prefix === 'XXX' || empty($prefix)) {
            $prefix = 'PRD';
        }

        // 3. ID sur 5 chiffres (ex: 00042) ou aléatoire sécurisé si pas d'ID
        $suffix = $id !== null 
            ? str_pad((string) $id, 5, '0', STR_PAD_LEFT) 
            : Str::upper(Str::random(5));

        return sprintf('%s-%s', $prefix, $suffix);
    }

    protected static function booted()
    {
        static::created(function (Product $product) {
            if (empty($product->reference) || str_starts_with($product->reference, 'TEMP-')) {
                $product->update([
                    'reference' => static::generateReference($product->name, $product->id),
                ]);
            }
        });
    }
}

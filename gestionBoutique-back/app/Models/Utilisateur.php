<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;


class Utilisateur extends Authenticatable implements JWTSubject
{
    use HasFactory;
  

    protected $table = 'utilisateurs'; // Nom de la table
    protected $primaryKey = 'id';
    public $timestamps = false;
    protected $fillable = [
        'nom',
        'prenom',
        'email',
        'mot_de_passe',
        'role'
    ];

    protected $hidden = [
        'mot_de_passe',
        'remember_token',
    ];

    // Indique à Laravel que 'mot_de_passe' est le champ du mot de passe
    public function setPasswordAttribute($value)
    {
        $this->attributes['mot_de_passe'] = bcrypt($value);
    }

    public function getAuthPassword()
    {
        return $this->mot_de_passe;
    }

    public function produits()
    {
        return $this->hasMany(Product::class, 'id_utilisateur');
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }
}

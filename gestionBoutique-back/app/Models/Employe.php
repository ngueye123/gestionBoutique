<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class Employe extends Authenticatable implements JWTSubject
{
    protected $table = 'employes';
    protected $primaryKey = 'id';
    public $timestamps = false;
    
    protected $fillable = [
        'nom',
        'email',
        'mot_de_passe',
        'role',
        'utilisateur_id',
    ];

    protected $hidden = ['mot_de_passe'];
    
    // Ajouter utilisateur_id aux attributs visibles
    protected $appends = ['user_type'];

    // Pour JWT - IMPORTANT
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'user_type' => 'employe',
            'role' => $this->role,
            'utilisateur_id' => $this->utilisateur_id  // ← IMPORTANT
        ];
    }

    // Attribut virtuel pour le user_type
    public function getUserTypeAttribute()
    {
        return 'employe';
    }

    // Pour l'authentification Laravel
    public function getAuthPassword()
    {
        return $this->mot_de_passe;
    }

    // Relation avec le patron
    public function patron()
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }
}
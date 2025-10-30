<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\MustVerifyEmail;

class Utilisateur extends Authenticatable implements JWTSubject, MustVerifyEmail
{
    use HasFactory, Notifiable;

    protected $table = 'utilisateurs';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'nom',
        'prenom',
        'email',
        'mot_de_passe',
        'role',
        'email_verified_at',
        'verification_token'
    ];

    protected $hidden = [
        'mot_de_passe',
        'remember_token',
        'verification_token'
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    protected $appends = ['user_type'];

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
        return $this->hasMany(Product::class, 'utilisateur_id');
    }

    public function employes()
    {
        return $this->hasMany(Employe::class, 'utilisateur_id');
    }

    // Pour JWT - IMPORTANT
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'email_verified' => !is_null($this->email_verified_at),
            'user_type' => 'patron'  // ← IMPORTANT
        ];
    }

    // Attribut virtuel pour le user_type
    public function getUserTypeAttribute()
    {
        return 'patron';
    }

    public function hasVerifiedEmail()
    {
        return !is_null($this->email_verified_at);
    }

    public function markEmailAsVerified()
    {
        $this->forceFill([
            'email_verified_at' => now(),
            'verification_token' => null
        ])->save();

        return true;
    }
}
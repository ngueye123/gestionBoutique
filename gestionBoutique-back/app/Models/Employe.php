<?php
// app/Models/Employe.php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Notifications\Notifiable; // ← AJOUT pour pouvoir envoyer des emails

class Employe extends Authenticatable implements JWTSubject
{
    use Notifiable; 

    protected $table      = 'employes';
    protected $primaryKey = 'id';

    protected $fillable = [
        'nom',
        'email',
        'mot_de_passe',
        'role',
        'utilisateur_id',
        'email_verified_at',   
        'verification_token',  
    ];

    protected $hidden = ['mot_de_passe', 'verification_token'];

    protected $casts = [
        'email_verified_at' => 'datetime', 
    ];

    protected $appends = ['user_type'];

    // ── JWT ──────────────────────────────────────────────────────────────────

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'user_type'      => 'employe',
            'role'           => $this->role,
            'utilisateur_id' => $this->utilisateur_id,
        ];
    }

    // ── Attributs virtuels ────────────────────────────────────────────────────

    public function getUserTypeAttribute(): string
    {
        return 'employe';
    }

    public function getAuthPassword(): string
    {
        return $this->mot_de_passe;
    }

    // ── Helpers vérification email ────────────────────────────────────────────

    /** Vérifie si l'email est confirmé */
    public function hasVerifiedEmail(): bool
    {
        return !is_null($this->email_verified_at);
    }

    /** Marque l'email comme vérifié et efface le token */
    public function markEmailAsVerified(): bool
    {
        return $this->forceFill([
            'email_verified_at'  => now(),
            'verification_token' => null,
        ])->save();
    }

    // ── Relations ─────────────────────────────────────────────────────────────

    public function patron()
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }
}
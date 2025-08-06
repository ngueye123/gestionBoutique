<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Tymon\JWTAuth\Contracts\JWTSubject;

class Employe extends Model implements JWTSubject
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

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }

    public function setMotDePasseAttribute($value)
    {
        $this->attributes['mot_de_passe'] = bcrypt($value);
    }

    public function patron()
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }
}

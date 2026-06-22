<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Sequence extends Model
{
    protected $table      = 'sequences';
    protected $primaryKey = 'cle';
    public    $incrementing = false; // PK non auto-increment (c'est une string)

    protected $fillable = ['cle', 'valeur'];

    /**
     * Récupère le prochain numéro de séquence pour une clé donnée,
     * de façon atomique — aucune race condition possible même avec
     * de fortes requêtes concurrentes.
     *
     * @param  string  $cle  Identifiant de la séquence (ex: "vente_20260621")
     * @return int           Le nouveau numéro, déjà incrémenté et persisté
     */
    public static function next(string $cle): int
    {
        return DB::transaction(function () use ($cle) {
            // lockForUpdate() verrouille la ligne — toute autre transaction
            // qui demande le même $cle attend que celle-ci soit terminée
            $sequence = self::lockForUpdate()->firstOrCreate(
                ['cle' => $cle],
                ['valeur' => 0]
            );

            $sequence->increment('valeur');

            return $sequence->valeur;
        });
    }
}
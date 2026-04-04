<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Caisse extends Model
{
    protected $fillable = [
        'employe_id',
        'utilisateur_id',
        'solde_actuel',
        'plafond',
        'est_bloquee',
    ];

    protected $casts = [
        'solde_actuel' => 'float',
        'plafond'      => 'float',
        'est_bloquee'  => 'boolean',
    ];

    // ─── Relations ──────────────────────────────────────────────────────────

    public function employe(): BelongsTo
    {
        return $this->belongsTo(Employe::class);
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class);
    }

    public function mouvements(): HasMany
    {
        return $this->hasMany(MouvementCaisse::class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Factory : récupère ou crée la caisse pour un acteur
    // ─────────────────────────────────────────────────────────────────────────

    public static function pour($actor): self
    {
        // ── Employé ──────────────────────────────────────────────────────────
        if ($actor instanceof Employe) {
            return self::firstOrCreate(
                [
                    'employe_id'     => $actor->id,
                    'utilisateur_id' => $actor->utilisateur_id,
                ],
                [
                    'solde_actuel' => 0,
                    'plafond'      => 500000,
                    'est_bloquee'  => false,
                ]
            );
        }

        // ── Patron (Utilisateur) ──────────────────────────────────────────────
        return self::firstOrCreate(
            [
                'employe_id'     => null,
                'utilisateur_id' => $actor->id,
            ],
            [
                'solde_actuel' => 0,
                'plafond'      => 500000,
                'est_bloquee'  => false,
            ]
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Opérations
    // ─────────────────────────────────────────────────────────────────────────

    public function crediter(
        float   $montant,
        string  $type = 'vente',
        ?int    $venteId = null,
        ?string $note = null
    ): MouvementCaisse {
        $soldeAvant         = $this->solde_actuel;
        $this->solde_actuel += $montant;
        $this->save();

        return MouvementCaisse::create([
            'caisse_id'        => $this->id,
            'utilisateur_id'   => $this->utilisateur_id,
            'type'             => $type,
            'montant'          => $montant,
            'solde_avant'      => $soldeAvant,
            'solde_apres'      => $this->solde_actuel,
            'vente_id'         => $venteId,
            'ticket_reference' => null,
            'note'             => $note,
        ]);
    }

    public function debiter(float $montant, ?string $note = null): MouvementCaisse
    {
        $soldeAvant         = $this->solde_actuel;
        $this->solde_actuel -= $montant;
        $this->save();

        $count     = MouvementCaisse::whereDate('created_at', today())
            ->where('type', 'prelevement')
            ->count() + 1;
        $reference = 'PREL-' . now()->format('Ymd') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        return MouvementCaisse::create([
            'caisse_id'        => $this->id,
            'utilisateur_id'   => $this->utilisateur_id,
            'type'             => 'prelevement',
            'montant'          => $montant,
            'solde_avant'      => $soldeAvant,
            'solde_apres'      => $this->solde_actuel,
            'vente_id'         => null,
            'ticket_reference' => $reference,
            'note'             => $note,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    public function depasseraitPlafond(float $montant): bool
    {
        return ($this->solde_actuel + $montant) > $this->plafond;
    }

    public function estBloquee(): bool
    {
        return $this->est_bloquee || $this->solde_actuel >= $this->plafond;
    }

    public function statutAlerte(): array
    {
        if ($this->plafond <= 0) {
            return ['pourcentage' => 0, 'niveau' => null, 'label' => '✅ Normal', 'attention' => false];
        }

        $pct = round(($this->solde_actuel / $this->plafond) * 100, 1);

        $niveau = match(true) {
            $pct >= 100 => 'danger',
            $pct >= 90  => 'critique',
            $pct >= 80  => 'warning',
            $pct >= 70  => 'info',
            default     => null,
        };

        $label = match($niveau) {
            'danger'   => '⛔ Plafond atteint',
            'critique' => '🔴 Plafond critique',
            'warning'  => '🟠 Plafond élevé',
            'info'     => '🟡 Plafond approche',
            default    => '✅ Normal',
        };

        return [
            'pourcentage' => $pct,
            'niveau'      => $niveau,
            'label'       => $label,
            'attention'   => $pct >= 70,
        ];
    }
}
<?php

namespace App\Services;

use App\Models\Client;
use App\Models\FideliteSetting;
use App\Models\FideliteHistorique;   // NEW
use App\Models\MouvementFidelite;

class FideliteService
{
    public function calculerPoints(int $ownerId, int $montant): int
    {
        if ($montant <= 0) {
            return 0;
        }

        $config = FideliteSetting::forOwner($ownerId);

        if ($config->montant_tranche <= 0 || $config->points_accordes <= 0) {
            return 0;
        }

        return intdiv($montant, $config->montant_tranche) * $config->points_accordes;
    }

    /**
     * Calcule ET crédite les points sur le client, journalise le mouvement,
     * ET alimente l'historique mensuel en cours (contrôle C8 : à appeler dans
     * une transaction DB déjà ouverte, avec $client verrouillé par l'appelant).
     *
     * @return array{points:int, solde_avant:int, solde_apres:int, mouvement_id:int|null}
     */
    public function crediterEtTracer(
        Client $client,
        int $ownerId,
        string $type,           // 'vente' | 'remboursement_dette'
        ?int $sourceId,
        int $montantReference,
    ): array {
        if ($montantReference <= 0) {
            return ['points' => 0, 'solde_avant' => $client->solde_points, 'solde_apres' => $client->solde_points, 'mouvement_id' => null];
        }

        $points = $this->calculerPoints($ownerId, $montantReference);

        // --- NEW : alimentation de l'historique mensuel (montant achat toujours tracé) ---
        $now = now();
        $historique = FideliteHistorique::firstOrCreate(
            ['client_id' => $client->id, 'mois' => (int) $now->format('n'), 'annee' => (int) $now->format('Y')],
            ['utilisateur_id' => $ownerId, 'montant_achat_total' => 0, 'points_total' => 0, 'est_consomme' => false]
        );
        $historique->increment('montant_achat_total', $montantReference);

        if ($points <= 0) {
            return ['points' => 0, 'solde_avant' => $client->solde_points, 'solde_apres' => $client->solde_points, 'mouvement_id' => null];
        }

        $soldeAvant = $client->solde_points;
        $client->crediterPoints($points);
        $soldeApres = $client->fresh()->solde_points;

        $historique->increment('points_total', $points); // NEW

        $mouvement = MouvementFidelite::create([
            'client_id'         => $client->id,
            'utilisateur_id'    => $ownerId,
            'type'              => $type,
            'source_id'         => $sourceId,
            'montant_reference' => $montantReference,
            'points'            => $points,
            'solde_avant'       => $soldeAvant,
            'solde_apres'       => $soldeApres,
        ]);

        return ['points' => $points, 'solde_avant' => $soldeAvant, 'solde_apres' => $soldeApres, 'mouvement_id' => $mouvement->id];
    }
}
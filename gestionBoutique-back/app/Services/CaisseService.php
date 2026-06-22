<?php

namespace App\Services;

use App\Models\Caisse;
use App\Models\MouvementCaisse;
use App\Models\BilanCaisse;
use App\Models\Employe;

class CaisseService
{
    /**
     * Calcule et sauvegarde un bilan de caisse pour une période donnée.
     * Extrait de CaisseController::calculerEtSauvegarderBilan().
     *
     * @param  Caisse  $caisse     La caisse concernée
     * @param  string  $debut      Date de début (Y-m-d)
     * @param  string  $fin        Date de fin (Y-m-d)
     * @param  float   $soldeReel  Solde physiquement compté par l'acteur
     * @param  mixed   $actor      Employe ou Utilisateur connecté
     * @return array               Données du bilan calculé
     */
    public function calculerEtSauvegarderBilan(
        Caisse $caisse,
        string $debut,
        string $fin,
        float  $soldeReel,
        mixed  $actor
    ): array {
        // Récupération de tous les mouvements sur la période
        $mouvements = MouvementCaisse::where('caisse_id', $caisse->id)
            ->whereBetween('created_at', [$debut . ' 00:00:00', $fin . ' 23:59:59'])
            ->get();

        // Calcul des entrées : ventes espèces + apports manuels + remboursements de dette
        $entrees = $mouvements
            ->whereIn('type', ['vente', 'apport', 'remboursement_dette'])
            ->sum('montant');

        // Calcul des sorties : prélèvements uniquement
        $sorties = $mouvements
            ->where('type', 'prelevement')
            ->sum('montant');

        // Reconstruction du solde de début de période
        $soldeDebut = $this->calculerSoldeDebut($caisse, $debut);

        // Solde théorique = ce qui devrait être en caisse d'après les mouvements
        $soldeTheorique = $soldeDebut + $entrees - $sorties;

        // Écart = différence entre le solde physique et le solde théorique
        $ecart = $soldeReel - $soldeTheorique;

        $statutEcart = match(true) {
            $ecart == 0 => 'equilibre',
            $ecart > 0  => 'surplus',
            default     => 'manquant',
        };

        // Génération de la référence unique du bilan pour le ticket PDF
        $reference = 'BILAN-' . now()->format('Ymd') . '-'
            . str_pad(
                BilanCaisse::whereDate('created_at', today())->count() + 1,
                4, '0', STR_PAD_LEFT
            );

        $bilan = BilanCaisse::create([
            'caisse_id'             => $caisse->id,
            'utilisateur_id'        => $this->resolveUtilisateurId($actor),
            'date_debut'            => $debut,
            'date_fin'              => $fin,
            'solde_debut'           => $soldeDebut,
            'total_entrees'         => $entrees,
            'total_sorties'         => $sorties,
            'solde_theorique'       => $soldeTheorique,
            'solde_reel'            => $soldeReel,
            'ecart'                 => $ecart,
            'nombre_ventes'         => $mouvements->where('type', 'vente')->count(),
            'nombre_remboursements' => $mouvements->where('type', 'remboursement_dette')->count(),
            'nombre_prelevements'   => $mouvements->where('type', 'prelevement')->count(),
            'statut_ecart'          => $statutEcart,
            'ticket_reference'      => $reference,
            'effectue_par'          => $this->resolveNomActeur($actor),
        ]);

        return [
            'bilan_id'              => $bilan->id,
            'acteur'                => $caisse->employe ? $caisse->employe->nom : 'Patron',
            'caisse_id'             => $caisse->id,
            'ticket_reference'      => $reference,
            'solde_debut'           => $soldeDebut,
            'total_entrees'         => $entrees,
            'total_sorties'         => $sorties,
            'solde_theorique'       => $soldeTheorique,
            'solde_reel'            => $soldeReel,
            'ecart'                 => $ecart,
            'statut_ecart'          => $statutEcart,
            'nombre_ventes'         => $bilan->nombre_ventes,
            'nombre_remboursements' => $bilan->nombre_remboursements,
            'nombre_prelevements'   => $bilan->nombre_prelevements,
        ];
    }

    /**
     * Reconstruit le solde de début de période en "rejouant"
     * les mouvements à l'envers depuis le solde actuel.
     *
     * Extrait de CaisseController::calculerSoldeDebut().
     *
     * NOTE AUDIT : Cette approche est fragile (cf. section 5.2.5).
     * Un solde_debut persisté à chaque mouvement serait plus fiable.
     * Conservée ici à l'identique pour ne pas changer le comportement métier.
     *
     * @param  Caisse  $caisse     La caisse concernée
     * @param  string  $dateDebut  Date de début de la période (Y-m-d)
     * @return float               Solde estimé en début de période
     */
    public function calculerSoldeDebut(Caisse $caisse, string $dateDebut): float
    {
        // On récupère tous les mouvements depuis le début de la période jusqu'à maintenant
        $mouvementsApres = MouvementCaisse::where('caisse_id', $caisse->id)
            ->where('created_at', '>=', $dateDebut . ' 00:00:00')
            ->orderByDesc('created_at')
            ->get();

        // On part du solde actuel et on "annule" chaque mouvement
        $solde = $caisse->solde_actuel;

        foreach ($mouvementsApres as $m) {
            // Les entrées sont soustraites (on les "annule")
            if (in_array($m->type, ['vente', 'apport', 'remboursement_dette'])) {
                $solde -= $m->montant;
            } else {
                // Les sorties (prélèvements) sont rajoutées
                $solde += $m->montant;
            }
        }

        // Le solde ne peut pas être négatif
        return max(0, $solde);
    }

    /**
     * Résout l'ID du patron (utilisateur) depuis l'acteur connecté.
     * Mutualisé ici pour ne pas dupliquer la logique dans le controller.
     *
     * @param  mixed  $actor  Employe ou Utilisateur
     * @return int
     */
    public function resolveUtilisateurId(mixed $actor): int
    {
        return $actor instanceof Employe
            ? $actor->utilisateur_id
            : $actor->id;
    }

    /**
     * Résout le nom lisible de l'acteur connecté pour les tickets et bilans.
     *
     * @param  mixed  $actor  Employe ou Utilisateur
     * @return string
     */
    public function resolveNomActeur(mixed $actor): string
    {
        if ($actor instanceof Employe) {
            return $actor->nom ?? 'Employé';
        }

        // Patron : on privilégie le nom de boutique, puis le nom civil, puis l'email
        return $actor->nom_boutique
            ?? $actor->nom
            ?? $actor->prenom
            ?? $actor->email
            ?? 'Patron';
    }

    /**
     * Construit le tableau d'informations de caisse retourné au frontend
     * après un crédit (vente espèces, remboursement espèces, apport...).
     *
     * Mutualisé ici car utilisé identiquement dans VenteService et
     * RemboursementController — source unique de vérité pour ce format.
     *
     * @param  Caisse  $caisse
     * @return array
     */
    public function buildCaisseInfo(Caisse $caisse): array
    {
        return [
            'solde_actuel' => (float) $caisse->solde_actuel,
            'plafond'      => (float) $caisse->plafond,
            'pourcentage'  => $caisse->plafond > 0
                ? round(($caisse->solde_actuel / $caisse->plafond) * 100, 1)
                : 0,
            'attention'    => $caisse->solde_actuel >= ($caisse->plafond * 0.8),
        ];
    }
}
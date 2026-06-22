<?php

namespace App\Services;

use App\Models\Vente;
use App\Models\VenteDetail;
use App\Models\Product;
use App\Models\Client;
use App\Models\Caisse;
use App\Models\Employe;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\DashboardCacheService;
class VenteService
{
    public function __construct(private readonly DashboardCacheService $dashboardCache) {}
    /**
     * Enregistre une vente complète dans une transaction atomique.
     *
     * Extrait de VenteController::store().
     * Centralise : vérification du stock, création vente + détails,
     * décrémentation du stock, gestion de la dette client et crédit caisse.
     *
     * @param  array  $validated  Données validées par le controller
     * @param  mixed  $actor      Employe ou Utilisateur connecté
     * @return array              ['vente', 'nouveau_solde_client', 'caisse']
     *
     * @throws \Exception  En cas d'erreur métier ou base de données
     */
    // APRÈS — la vérification de stock ET la décrémentation doivent être
// DANS la transaction, avec lockForUpdate() pour bloquer les lectures concurrentes

public function enregistrerVente(array $validated, mixed $actor): array
{
    $ownerId   = $actor instanceof Employe ? $actor->utilisateur_id : $actor->id;
    $employeId = $actor instanceof Employe ? $actor->id : null;

    // Résolution du client AVANT la transaction (pas de verrou nécessaire ici)
    $client   = null;
    $clientId = null;

    if ($validated['moyen_paiement'] === 'dette') {
        if (empty($validated['client_id'])) {
            throw new \RuntimeException('Client requis pour une vente à crédit', 400);
        }
        $client   = Client::byUtilisateur($ownerId)->findOrFail($validated['client_id']);
        $clientId = $client->id;
    }

    DB::beginTransaction();

    try {
        $total      = 0;
        $venteItems = [];

        // ── Vérification stock + verrouillage DANS la transaction ────────────
        foreach ($validated['items'] as $item) {
            // lockForUpdate() : bloque la ligne jusqu'au commit/rollback,
            // empêchant une autre vente simultanée de lire ce même produit
            $product = Product::where('id', $item['id'])
                ->where('utilisateur_id', $ownerId)
                ->lockForUpdate()
                ->first();

            if (!$product) {
                throw new \RuntimeException("Produit introuvable : {$item['id']}", 404);
            }

            if ($product->stock < $item['quantity']) {
                throw new \RuntimeException(
                    "Stock insuffisant pour {$product->name}. Disponible : {$product->stock}",
                    400
                );
            }

            $sousTotal    = $product->price * $item['quantity'];
            $total       += $sousTotal;
            $venteItems[] = [
                'product'    => $product,
                'quantity'   => $item['quantity'],
                'sous_total' => $sousTotal,
            ];
        }

        if (
            $validated['moyen_paiement'] === 'especes'
            && (!isset($validated['montant_recu']) || $validated['montant_recu'] < $total)
        ) {
            throw new \RuntimeException('Montant reçu insuffisant', 400);
        }

        $vente = Vente::create([
            'reference'      => Vente::generateReference(),
            'utilisateur_id' => $ownerId,
            'employe_id'     => $employeId,
            'client_id'      => $clientId,
            'total'          => $total,
            'moyen_paiement' => $validated['moyen_paiement'],
            'montant_recu'   => $validated['montant_recu'] ?? $total,
            'monnaie'        => isset($validated['montant_recu'])
                ? $validated['montant_recu'] - $total
                : 0,
        ]);

        foreach ($venteItems as $venteItem) {
            $product = $venteItem['product'];

            VenteDetail::create([
                'vente_id'          => $vente->id,
                'product_id'        => $product->id,
                'reference_produit' => $product->reference,
                'nom_produit'       => $product->name,
                'quantite'          => $venteItem['quantity'],
                'prix_unitaire'     => $product->price,
                'sous_total'        => $venteItem['sous_total'],
            ]);

            // Décrémentation atomique conditionnelle : double sécurité.
            // Même si lockForUpdate() protège déjà, cette requête garantit
            // qu'on ne décrémente jamais sous 0, peu importe le scénario.
            $affected = Product::where('id', $product->id)
                ->where('stock', '>=', $venteItem['quantity'])
                ->decrement('stock', $venteItem['quantity']);

            if (!$affected) {
                // Ne devrait jamais arriver grâce au lock, mais on sécurise quand même
                throw new \RuntimeException(
                    "Stock insuffisant pour {$product->name} (conflit détecté)",
                    409
                );
            }
        }

        if ($validated['moyen_paiement'] === 'dette' && $client) {
            $client->ajouterDette($total);
        }

       $caisseInfo = null;
        if ($validated['moyen_paiement'] === 'especes') {
            $caisse = Caisse::pour($actor);
            $caisse->crediter($total, 'vente', $vente->id, "Vente {$vente->reference}");
            $caisse->refresh();

            // Remplace $this->buildCaisseInfo($caisse)
            $caisseInfo = $this->caisseService->buildCaisseInfo($caisse);
        }

        DB::commit();

        $this->dashboardCache->invalidate($ownerId);

        $vente->load('details', 'client');

        return [
            'vente'                => $vente,
            'nouveau_solde_client' => $client ? $client->fresh()->solde_dette : null,
            'caisse'               => $caisseInfo,
        ];

    } catch (\Exception $e) {
        DB::rollBack();

        Log::error('Erreur enregistrement vente', [
            'actor_id'       => $actor->id,
            'actor_type'     => $actor instanceof Employe ? 'employe' : 'patron',
            'moyen_paiement' => $validated['moyen_paiement'],
            'error'          => $e->getMessage(),
        ]);

        throw $e;
    }
}
    /**
     * Construit le tableau d'informations de caisse retourné au frontend.
     * Mutualisé ici car utilisé identiquement dans VenteService et RemboursementController.
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
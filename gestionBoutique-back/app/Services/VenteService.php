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

class VenteService
{
    public function __construct(
        private readonly CaisseService $caisseService,
        private readonly DashboardCacheService $dashboardCache,
    ) {}

    /**
     * Enregistre une vente complète dans une transaction atomique.
     *
     * @param  array  $validated  Données validées par le controller
     * @param  mixed  $actor      Employe ou Utilisateur connecté
     * @return array              ['vente', 'nouveau_solde_client', 'caisse']
     *
     * @throws \Exception  En cas d'erreur métier ou base de données
     */
    public function enregistrerVente(array $validated, mixed $actor): array
    {
        $ownerId   = $actor instanceof Employe ? $actor->utilisateur_id : $actor->id;
        $employeId = $actor instanceof Employe ? $actor->id : null;

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

            foreach ($validated['items'] as $item) {
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

                $affected = Product::where('id', $product->id)
                    ->where('stock', '>=', $venteItem['quantity'])
                    ->decrement('stock', $venteItem['quantity']);

                if (!$affected) {
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
}
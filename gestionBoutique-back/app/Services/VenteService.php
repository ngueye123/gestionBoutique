<?php

namespace App\Services;

use App\Models\Vente;
use App\Models\VenteDetail;
use App\Models\Product;
use App\Models\Client;
use App\Models\Caisse;
use App\Models\Employe;
use App\Models\SecuritySetting;
use App\Models\PriceOverride;
use App\Models\Utilisateur;
use App\Support\UnitConverter;
use App\Notifications\PriceOverrideNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;


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
            $montantRecu = $validated['moyen_paiement'] === 'especes'
                ? (float) ($validated['montant_recu'] ?? 0)
                : null;

            $vente = Vente::create([
                'reference'       => Vente::generateReference(),
                'utilisateur_id'  => $ownerId,
                'employe_id'      => $employeId,
                'client_id'       => $clientId,
                'total'           => 0,
                'moyen_paiement'  => $validated['moyen_paiement'],
                'montant_recu'    => $montantRecu,
                'monnaie'         => 0,
            ]);

            foreach ($validated['items'] as $item) {
                $product = Product::where('id', $item['id'])
                    ->where('utilisateur_id', $ownerId)
                    ->lockForUpdate()
                    ->first();

                if (!$product) {
                    throw new \RuntimeException("Produit introuvable : {$item['id']}", 404);
                }

                $uniteVente = $item['unite'] ?? $product->unit_reference;

                if (!UnitConverter::isCompatible($product->unit_type, $uniteVente)) {
                    throw new \RuntimeException(
                        "Unité '{$uniteVente}' incompatible avec le produit {$product->name}",
                        422
                    );
                }

                $qtyBase = UnitConverter::toBase($product->unit_type, $uniteVente, (float) $item['quantity']);

                if (bccomp((string) $product->stock, (string) $qtyBase, 3) < 0) {
                    $uniteBase = UnitConverter::baseUnit($product->unit_type);
                    throw new \RuntimeException(
                        "Stock insuffisant pour {$product->name}. Disponible : {$product->stock} {$uniteBase}",
                        400
                    );
                }

                // --- Surcharge de prix ---
                $prixNormal = $product->price;
                $prixFinal  = $item['prix_override'] ?? $prixNormal;
                $isOverride = bccomp((string) $prixFinal, (string) $prixNormal, 2) !== 0;

                if ($isOverride) {
                    $this->autoriserOverride($actor, $item['pin'] ?? null);
                }

                $pricePerBase = UnitConverter::pricePerBase($product->unit_type, $product->unit_reference, $prixFinal);
                $sousTotal    = round($pricePerBase * $qtyBase, 2);
                $total       += $sousTotal;
                $venteItems[] = [
                    'product'         => $product,
                    'quantity'        => $item['quantity'],
                    'unite_vente'     => $uniteVente,
                    'quantite_base'   => $qtyBase,
                    'sous_total'      => $sousTotal,
                    'prix_normal'     => $prixNormal,
                    'prix_final'      => $prixFinal,
                    'is_override'     => $isOverride,
                    'justification'   => $item['justification'] ?? null,
                ];
            }

            if (
                $validated['moyen_paiement'] === 'especes'
                && (!isset($validated['montant_recu']) || $validated['montant_recu'] < $total)
            ) {
                throw new \RuntimeException('Montant reçu insuffisant', 400);
            }

            foreach ($venteItems as $venteItem) {
                $product = $venteItem['product'];

                $venteDetail = VenteDetail::create([
                    'vente_id'          => $vente->id,
                    'product_id'        => $product->id,
                    'reference_produit' => $product->reference,
                    'nom_produit'       => $product->name,
                    'quantite'          => $venteItem['quantity'],
                    'unite_vente'       => $venteItem['unite_vente'],
                    'quantite_base'     => $venteItem['quantite_base'],
                    'prix_unitaire'     => $venteItem['prix_final'],
                    'unite_prix'        => $product->unit_reference,
                    'sous_total'        => $venteItem['sous_total'],
                    'prix_original'     => $venteItem['is_override'] ? $venteItem['prix_normal'] : null,
                    'prix_override'     => $venteItem['is_override'],
                ]);

                if ($venteItem['is_override']) {
                    // Note: the `price_overrides` table defines an `employe_id` FK
                    // constrained to `utilisateurs`. To match the migration, store
                    // the owner utilisateur id in `employe_id` and avoid writing
                    // a non-existent `utilisateur_id` column.
                    $priceOverride = PriceOverride::create([
                        'vente_id'        => $vente->id,
                        'vente_detail_id' => $venteDetail->id,
                        'product_id'      => $product->id,
                        'employe_id'      => $employeId,
                        'prix_normal'     => $venteItem['prix_normal'],
                        'prix_applique'   => $venteItem['prix_final'],
                        'justification'   => $venteItem['justification'],
                        'pin_utilise'     => $actor instanceof Employe,
                        'ip_address'      => request()->ip(),
                    ]);

                    // Envoi asynchrone (queue), ne bloque pas l'encaissement
                    Notification::route('mail', Utilisateur::find($ownerId)->email)
                        ->notify(new PriceOverrideNotification($priceOverride, $product, $actor));
                }

                $affected = Product::where('id', $product->id)
                    ->where('stock', '>=', $venteItem['quantite_base'])
                    ->decrement('stock', $venteItem['quantite_base']);

                if (!$affected) {
                    throw new \RuntimeException(
                        "Stock insuffisant pour {$product->name} (conflit détecté)",
                        409
                    );
                }
            }

            $vente->update([
                'total' => round($total, 2),
                'montant_recu' => $validated['moyen_paiement'] === 'especes' ? $montantRecu : null,
                'monnaie' => $validated['moyen_paiement'] === 'especes' ? round(max(0, $montantRecu - $total), 2) : 0,
            ]);

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

    /**
     * Vérifie que l'acteur est autorisé à appliquer une surcharge de prix.
     * Le patron (acteur non-Employe) est exempté de PIN.
     *
     * @throws \RuntimeException  Si le PIN est manquant ou invalide
     */
    private function autoriserOverride(mixed $actor, ?string $pin): void
    {
        if (!$actor instanceof Employe) {
            return; // patron / propriétaire du compte : bypass
        }

        if (!$pin || !SecuritySetting::current()->verifyPin($pin)) {
            throw new \RuntimeException('Code PIN invalide ou manquant pour la surcharge de prix', 403);
        }
    }
}
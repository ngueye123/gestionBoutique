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
use App\Models\VentePaiement;
use App\Models\Utilisateur;
use App\Models\MouvementCaisse;
use APP\Models\Fidelite;
use App\Services\FideliteService;
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
        private readonly FideliteService $fideliteService,  
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

        $paiements = $validated['paiements'];
        $clientId  = $validated['client_id'] ?? null;   

        // --- Contrôle C3 : dette exige un client rattaché ---
        $ligneDette = collect($paiements)->firstWhere('mode', 'dette');
        if ($ligneDette && !$clientId) {
            throw new \RuntimeException('Client requis pour une vente à crédit', 400);
        }

        $client = $clientId
            ? Client::byUtilisateur($ownerId)->findOrFail($clientId)
            : null;

        DB::beginTransaction();

        try {
            $total      = 0;
            $venteItems = [];

            $vente = Vente::create([
                'reference'       => Vente::generateReference(),
                'utilisateur_id'  => $ownerId,
                'employe_id'      => $employeId,
                'client_id'       => $clientId,
                'total'           => 0,
                'moyen_paiement'  => count($paiements) > 1 ? 'mixte' : $paiements[0]['mode'],
                'montant_recu'    => null,
                'monnaie'         => 0,
            ]);

            // --- Traitement des articles (inchangé) ---
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

            // --- Contrôles C1/C2/C6/C7 : ventilation des paiements sur le total ---
            $resteAPayer     = round($total, 2);
            $montantRecuEspeces = 0.0;
            $monnaieTotal       = 0.0;
            $lignesAPersister   = [];

            foreach ($paiements as $p) {
                $mode = $p['mode'];

                if ($mode === 'especes') {
                    $montantRecu    = round((float) ($p['montant_recu'] ?? 0), 2);
                    if ($montantRecu <= 0) {
                        throw new \RuntimeException('Montant reçu en espèces invalide', 400);
                    }
                    $montantAffecte = min($montantRecu, $resteAPayer);
                    $monnaie        = round($montantRecu - $montantAffecte, 2);

                    $lignesAPersister[] = [
                        'mode'            => 'especes',
                        'montant'         => $montantAffecte,
                        'montant_recu'    => $montantRecu,
                        'monnaie_rendue'  => $monnaie,
                    ];

                    $montantRecuEspeces += $montantRecu;
                    $monnaieTotal       += $monnaie;
                    $resteAPayer         = round($resteAPayer - $montantAffecte, 2);

                } else {
                    $montant = round((float) ($p['montant'] ?? 0), 2);
                    if ($montant <= 0) {
                        throw new \RuntimeException("Montant invalide pour le mode {$mode}", 400);
                    }
                    if ($montant - $resteAPayer > 0.01) {
                        throw new \RuntimeException(
                            "Le montant en {$mode} ({$montant}) dépasse le reste à payer ({$resteAPayer})",
                            400
                        );
                    }

                    $lignesAPersister[] = [
                        'mode'                    => $mode,
                        'montant'                 => $montant,
                        'reference_transaction'   => $p['reference_transaction'] ?? null,
                        'client_id'               => $mode === 'dette' ? $clientId : null,
                    ];

                    $resteAPayer = round($resteAPayer - $montant, 2);
                }
            }

            if ($resteAPayer > 0.01) {
                throw new \RuntimeException(
                    "Paiement incomplet : il reste {$resteAPayer} F à payer",
                    422
                );
            }

            // --- Persistance des lignes d'articles (inchangé) ---
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

            // --- Persistance des lignes de paiement + effets de bord par mode ---
            $caisse     = null;
            $caisseInfo = null;

            foreach ($lignesAPersister as $ligne) {
                VentePaiement::create(array_merge(
                    ['vente_id' => $vente->id],
                    $ligne
                ));

                if ($ligne['mode'] === 'especes') {
                    $caisse ??= Caisse::pour($actor);
                    $caisse->crediter($ligne['montant'], 'vente', $vente->id, "Vente {$vente->reference}");
                }

                if ($ligne['mode'] === 'dette' && $client) {
                    $client->ajouterDette($ligne['montant']);
                }
            }

           //  Fidélité — points sur la part comptant, indépendamment du mode ---
            $fideliteInfo = null;
            if ($client) {
                $montantDetteVente = (int) round(
                    collect($lignesAPersister)->where('mode', 'dette')->sum('montant')
                );
                $montantComptant = max(0, (int) round($total) - $montantDetteVente);

                $fideliteInfo = $this->fideliteService->crediterEtTracer(
                    client: $client,
                    ownerId: $ownerId,
                    type: 'vente',
                    sourceId: $vente->id,
                    montantReference: $montantComptant,
                );
            }

            if ($caisse) {
                $caisse->refresh();
                $caisseInfo = $this->caisseService->buildCaisseInfo($caisse);
            }

            $vente->update([
                'total'        => round($total, 2),
                'montant_recu' => $montantRecuEspeces > 0 ? $montantRecuEspeces : null,
                'monnaie'      => round($monnaieTotal, 2),
            ]);

            DB::commit();

            $this->dashboardCache->invalidate($ownerId);

            $vente->load('details', 'client', 'paiements');

            return [
                'vente'                => $vente,
                'nouveau_solde_client' => $client ? $client->fresh()->solde_dette : null,
                'caisse'               => $caisseInfo,
                'fidelite'             => $fideliteInfo,
            ];

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Erreur enregistrement vente', [
                'actor_id'   => $actor->id,
                'actor_type' => $actor instanceof Employe ? 'employe' : 'patron',
                'paiements'  => $paiements,
                'error'      => $e->getMessage(),
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
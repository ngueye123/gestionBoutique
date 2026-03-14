<?php

namespace App\Http\Middleware;

use App\Models\Caisse;
use Closure;
use Illuminate\Http\Request;

class CheckCaissePlafond
{
    public function handle(Request $request, Closure $next)
    {
        // ─── Guard JWT explicite ─────────────────────────────────────────────
        $actor = auth('api')->user();

        if (!$actor) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }

        // ✅ On intercepte uniquement les opérations espèces
        $moyenPaiement = $request->input('moyen_paiement');
        $estEspeces    = $moyenPaiement === 'especes';

        if (!$estEspeces) {
            return $next($request);
        }

        $caisse = Caisse::pour($actor);

        // ─── 1. Blocage manuel ───────────────────────────────────────────────
        if ($caisse->est_bloquee) {
            return response()->json([
                'success' => false,
                'code'    => 'CAISSE_BLOQUEE',
                'raison'  => 'bloquee_manuellement',
                'message' => 'Votre caisse a été bloquée manuellement par le patron. Contactez-le avant de continuer.',
                'caisse'  => $this->infoCaisse($caisse, 0),
            ], 422);
        }

        // ─── 2. Calcul du montant entrant ────────────────────────────────────
        $montantEntrant  = 0;
        $typeOperation   = $request->input('type_operation');

        if ($typeOperation === 'remboursement_dette') {
            $montantEntrant = floatval($request->input('montant_rembourse', 0));
        } else {
            // Vente normale : recalcul serveur pour sécurité
            $items = $request->input('items', []);
            foreach ($items as $item) {
                $produit = \App\Models\Product::find($item['id'] ?? null);
                if ($produit) {
                    $montantEntrant += $produit->price * ($item['quantity'] ?? 1);
                }
            }
        }

        $soldeApres  = $caisse->solde_actuel + $montantEntrant;
        $pourcentage = $caisse->plafond > 0
            ? round(($caisse->solde_actuel / $caisse->plafond) * 100, 1)
            : 0;

        // ─── 3. Plafond déjà atteint ─────────────────────────────────────────
        if ($caisse->solde_actuel >= $caisse->plafond) {
            return response()->json([
                'success' => false,
                'code'    => 'CAISSE_BLOQUEE',
                'raison'  => 'plafond_atteint',
                'message' => "Votre caisse est pleine ({$pourcentage}% du plafond). Effectuez un prélèvement avant de continuer.",
                'caisse'  => $this->infoCaisse($caisse, $montantEntrant),
            ], 422);
        }

        // ─── 4. Cette opération dépasserait le plafond ───────────────────────
        if ($soldeApres > $caisse->plafond) {
            $depasse = round($soldeApres - $caisse->plafond);
            return response()->json([
                'success' => false,
                'code'    => 'CAISSE_BLOQUEE',
                'raison'  => 'plafond_depasse_par_operation',
                'message' => "Cette opération dépasserait le plafond de "
                    . number_format($caisse->plafond, 0, ',', ' ')
                    . " F. Prélevez au moins "
                    . number_format($depasse, 0, ',', ' ')
                    . " F avant de continuer.",
                'caisse'  => $this->infoCaisse($caisse, $montantEntrant),
            ], 422);
        }

        // ─── 5. Alertes seuils 70 / 80 / 90 / 100% ──────────────────────────
        $pourcentageApres = $caisse->plafond > 0
            ? round(($soldeApres / $caisse->plafond) * 100, 1)
            : 0;

        $alerte = null;
        if ($pourcentageApres >= 100) {
            $alerte = ['niveau' => 'danger',   'seuil' => 100, 'message' => "⛔ Caisse à 100% du plafond ! Prélevez avant la prochaine vente."];
        } elseif ($pourcentageApres >= 90) {
            $alerte = ['niveau' => 'critique', 'seuil' => 90,  'message' => "🔴 Caisse à {$pourcentageApres}% du plafond. Prélèvement urgent recommandé."];
        } elseif ($pourcentageApres >= 80) {
            $alerte = ['niveau' => 'warning',  'seuil' => 80,  'message' => "🟠 Caisse à {$pourcentageApres}% du plafond. Pensez à prélever bientôt."];
        } elseif ($pourcentageApres >= 70) {
            $alerte = ['niveau' => 'info',     'seuil' => 70,  'message' => "🟡 Caisse à {$pourcentageApres}% du plafond."];
        }

        // Injecter l'alerte pour que le controller la récupère dans la réponse
        $request->merge([
            '_alerte_caisse'           => $alerte,
            '_pourcentage_caisse_apres' => $pourcentageApres,
        ]);

        return $next($request);
    }

    private function infoCaisse(Caisse $caisse, float $montantOperation): array
    {
        $aPrelever = max(0, $caisse->solde_actuel - ($caisse->plafond * 0.7));

        return [
            'solde_actuel'      => floatval($caisse->solde_actuel),
            'plafond'           => floatval($caisse->plafond),
            'pourcentage'       => $caisse->plafond > 0
                ? round(($caisse->solde_actuel / $caisse->plafond) * 100, 1)
                : 0,
            'montant_operation' => $montantOperation,
            'a_prelever'        => round($aPrelever),
        ];
    }
}
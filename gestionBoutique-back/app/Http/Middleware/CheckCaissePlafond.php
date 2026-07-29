<?php

namespace App\Http\Middleware;

use App\Models\Caisse;
use App\Models\Employe;
use App\Models\Utilisateur;
use Closure;
use Illuminate\Http\Request;

class CheckCaissePlafond
{
    public function handle(Request $request, Closure $next)
    {
        // Intercepte uniquement les opérations comportant une part payée en espèces
        $ligneEspeces = collect($request->input('paiements', []))
            ->firstWhere('mode', 'especes');

        if (!$ligneEspeces && $request->input('type_operation') !== 'remboursement_dette') {
            return $next($request);
        }

        $actor = $this->getActor();
        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Non authentifié.'], 401);
        }

        $caisse = Caisse::pour($actor);

        // 1. Blocage manuel
        if ($caisse->est_bloquee) {
            return response()->json([
                'success' => false,
                'code'    => 'CAISSE_BLOQUEE',
                'raison'  => 'bloquee_manuellement',
                'message' => 'Votre caisse a été bloquée manuellement par le patron.',
                'caisse'  => $this->infoCaisse($caisse, 0),
            ], 422);
        }

        // 2. Calcul montant entrant : uniquement la part réellement remise en espèces
        if ($request->input('type_operation') === 'remboursement_dette') {
            $montantEntrant = floatval($request->input('montant_rembourse', 0));
        } else {
            $montantEntrant = (float) ($ligneEspeces['montant_recu'] ?? 0);
        }

        $soldeApres  = $caisse->solde_actuel + $montantEntrant;
        $pourcentage = $caisse->plafond > 0
            ? round(($caisse->solde_actuel / $caisse->plafond) * 100, 1)
            : 0;

        // 3. Plafond déjà atteint
        if ($caisse->solde_actuel >= $caisse->plafond) {
            return response()->json([
                'success' => false,
                'code'    => 'CAISSE_BLOQUEE',
                'raison'  => 'plafond_atteint',
                'message' => "Caisse pleine ({$pourcentage}%). Prélevez avant de continuer.",
                'caisse'  => $this->infoCaisse($caisse, $montantEntrant),
            ], 422);
        }

        // 4. Opération dépasserait le plafond
        if ($soldeApres > $caisse->plafond) {
            $depasse = round($soldeApres - $caisse->plafond);
            return response()->json([
                'success' => false,
                'code'    => 'CAISSE_BLOQUEE',
                'raison'  => 'plafond_depasse_par_operation',
                'message' => "Cette opération dépasserait le plafond. Prélevez au moins "
                    . number_format($depasse, 0, ',', ' ') . " F avant de continuer.",
                'caisse'  => $this->infoCaisse($caisse, $montantEntrant),
            ], 422);
        }

        // 5. Alertes seuils 70/80/90/100%
        $pourcentageApres = $caisse->plafond > 0
            ? round(($soldeApres / $caisse->plafond) * 100, 1)
            : 0;

        $alerte = null;
        if ($pourcentageApres >= 100) {
            $alerte = ['niveau' => 'danger',   'seuil' => 100, 'message' => "⛔ Caisse à 100% ! Prélevez avant la prochaine vente."];
        } elseif ($pourcentageApres >= 90) {
            $alerte = ['niveau' => 'critique', 'seuil' => 90,  'message' => "🔴 Caisse à {$pourcentageApres}%. Prélèvement urgent."];
        } elseif ($pourcentageApres >= 80) {
            $alerte = ['niveau' => 'warning',  'seuil' => 80,  'message' => "🟠 Caisse à {$pourcentageApres}%. Pensez à prélever."];
        } elseif ($pourcentageApres >= 70) {
            $alerte = ['niveau' => 'info',     'seuil' => 70,  'message' => "🟡 Caisse à {$pourcentageApres}%."];
        }

        $request->merge([
            '_alerte_caisse'            => $alerte,
            '_pourcentage_caisse_apres' => $pourcentageApres,
        ]);

        return $next($request);
    }

    /**
     * ✅ Même logique que CaisseController::getActor()
     * Teste d'abord le guard 'employe', puis 'api'.
     */
    private function getActor()
    {
        try {
            $employe = auth('employe')->user();
            if ($employe instanceof Employe) {
                return $employe;
            }
        } catch (\Exception $e) {}

        try {
            $utilisateur = auth('api')->user();
            if ($utilisateur instanceof Utilisateur) {
                return $utilisateur;
            }
        } catch (\Exception $e) {}

        return null;
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
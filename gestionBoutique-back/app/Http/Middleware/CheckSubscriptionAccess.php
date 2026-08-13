<?php

namespace App\Http\Middleware;

use App\Http\Controllers\RoleHelper;
use App\Models\Subscription;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérifie que la boutique de l'utilisateur authentifié dispose d'un abonnement lui donnant
 * accès à l'application (essai en cours, actif, ou en période de grâce après un impayé).
 *
 * À enregistrer EN COMPLÉMENT de `jwt.custom` (jamais à la place) sur les routes métier
 * qui doivent être bloquées en cas d'abonnement expiré. Les routes de paiement
 * (initiation Wave Checkout) et le webhook Wave ne doivent JAMAIS être protégées par ce
 * middleware, sous peine d'empêcher une boutique expirée de régulariser son paiement.
 */
class CheckSubscriptionAccess
{
    use RoleHelper;

    public function handle(Request $request, Closure $next): Response
    {
        $boutiqueId = $this->getOwnerId();

        if ($boutiqueId === null) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }

        $subscription = Subscription::where('boutique_id', $boutiqueId)->first();

        if ($subscription === null) {
            return response()->json([
                'success' => false,
                'code'    => 'SUBSCRIPTION_REQUIRED',
                'message' => 'Aucun abonnement associé à cette boutique. Veuillez contacter le support.',
            ], 402);
        }

        // Transitions "paresseuses" défensives : garantit la cohérence immédiate même si le job
        // planifié quotidien (SubscriptionRenewalService) n'est pas encore passé.
        if ($subscription->isTrialExpired()) {
            $subscription->markAsExpired('essai_termine');
        } elseif ($subscription->isCurrentPeriodExpired()) {
            $subscription->markAsPastDue('periode_courante_expiree');
        }

        if (!$subscription->isAccessAllowed()) {
            return response()->json([
                'success' => false,
                'code'    => 'SUBSCRIPTION_EXPIRED',
                'status'  => $subscription->status,
                'message' => 'Votre abonnement a expiré. Veuillez régulariser votre paiement pour continuer.',
            ], 402);
        }

        $response = $next($request);

        if ($subscription->status === Subscription::STATUS_PAST_DUE) {
            $response->headers->set('X-Subscription-Warning', 'past_due');
        }

        return $response;
    }
}

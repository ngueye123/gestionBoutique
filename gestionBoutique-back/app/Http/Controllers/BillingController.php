<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Subscription;
use App\Services\WavePaymentService;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Gestion de l'abonnement et du paiement Wave par le patron d'une boutique.
 * Volontairement NON protégée par le middleware `subscription.access` : une boutique dont
 * l'abonnement est expiré doit toujours pouvoir consulter son statut et payer.
 */
class BillingController extends Controller
{
    use RoleHelper;

    public function __construct(private readonly WavePaymentService $wavePaymentService)
    {
    }

    public function show(Request $request)
    {
        $boutiqueId = $this->getOwnerId();
        if ($boutiqueId === null) {
            return $this->accessDeniedResponse('Non authentifié.');
        }

        $subscription = Subscription::with(['plan', 'invoices' => function ($query) {
            $query->latest('id')->limit(10);
        }])->where('boutique_id', $boutiqueId)->first();

        if ($subscription === null) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun abonnement trouvé pour cette boutique.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'subscription' => $subscription,
        ]);
    }

    public function initiateCheckout(Request $request)
    {
        if (!$this->isPatron()) {
            return $this->accessDeniedResponse('Seul le patron peut gérer le paiement de l\'abonnement.');
        }

        $boutiqueId = $this->getOwnerId();
        $subscription = Subscription::with('plan')->where('boutique_id', $boutiqueId)->first();

        if ($subscription === null) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun abonnement trouvé pour cette boutique.',
            ], 404);
        }

        $invoice = Invoice::create([
            'subscription_id' => $subscription->id,
            'amount_xof'      => $subscription->plan->price_xof,
            'status'          => Invoice::STATUS_PENDING,
            'due_date'        => now(),
        ]);

        try {
            $checkout = $this->wavePaymentService->createCheckoutSession($invoice);
        } catch (RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible d\'initier le paiement pour le moment. Veuillez réessayer.',
            ], 502);
        }

        return response()->json([
            'success'      => true,
            'checkout_url' => $checkout['checkout_url'],
            'invoice_id'   => $invoice->id,
        ]);
    }
}

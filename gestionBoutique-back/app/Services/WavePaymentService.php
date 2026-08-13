<?php

namespace App\Services;

use App\Models\Invoice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Intégration avec l'API Checkout de Wave (Sénégal).
 *
 * ⚠️ Implémenté d'après l'exemple confirmé dans la doc Wave consultée
 * (POST https://api.wave.com/v1/checkout/sessions, champs amount/currency/error_url/success_url,
 * réponse contenant id + wave_launch_url). Le schéma de réponse complet (tous les champs
 * possibles, noms exacts de `checkout_status`/`payment_status`) n'a pas pu être re-vérifié
 * (page dédiée "Checkout API" en 404 durant cette session) : à confirmer dans le Wave Business
 * Portal / docs.wave.com avant mise en production.
 */
class WavePaymentService
{
    public function __construct(
        private readonly ?string $apiKey = null,
        private readonly ?string $baseUrl = null,
    ) {
    }

    private function resolvedApiKey(): string
    {
        return $this->apiKey ?? (string) config('services.wave.api_key');
    }

    private function resolvedBaseUrl(): string
    {
        return rtrim($this->baseUrl ?? (string) config('services.wave.base_url'), '/');
    }

    /**
     * Crée une session de paiement Wave Checkout pour une facture d'abonnement,
     * et enregistre l'identifiant de session (`wave_checkout_id`) sur la facture.
     *
     * @return array{checkout_url: string, session_id: string}
     */
    public function createCheckoutSession(Invoice $invoice): array
    {
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

        // XOF est une devise sans décimales : le montant est envoyé en tant que chaîne d'entier.
        $payload = [
            'amount'           => (string) $invoice->amount_xof,
            'currency'         => 'XOF',
            'client_reference' => 'invoice-' . $invoice->id,
            'success_url'      => $frontendUrl . '/parametres/abonnement?paiement=succes',
            'error_url'        => $frontendUrl . '/parametres/abonnement?paiement=echec',
        ];

        $response = Http::withToken($this->resolvedApiKey())
            ->acceptJson()
            ->post($this->resolvedBaseUrl() . '/v1/checkout/sessions', $payload);

        if ($response->failed()) {
            Log::error('Wave: échec de création de session Checkout', [
                'invoice_id' => $invoice->id,
                'status'     => $response->status(),
                'body'       => $response->body(),
            ]);

            throw new RuntimeException('Impossible de créer la session de paiement Wave.');
        }

        $data = $response->json();
        $sessionId = $data['id'] ?? null;
        $checkoutUrl = $data['wave_launch_url'] ?? null;

        if ($sessionId === null || $checkoutUrl === null) {
            Log::error('Wave: réponse de session Checkout inattendue', [
                'invoice_id' => $invoice->id,
                'body'       => $data,
            ]);

            throw new RuntimeException('Réponse Wave invalide lors de la création de la session de paiement.');
        }

        $invoice->update(['wave_checkout_id' => $sessionId]);

        return [
            'checkout_url' => $checkoutUrl,
            'session_id'   => $sessionId,
        ];
    }
}

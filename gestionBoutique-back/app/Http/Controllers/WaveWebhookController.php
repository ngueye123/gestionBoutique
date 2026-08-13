<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Services\WaveWebhookVerifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Réception des webhooks Wave Checkout (paiement d'abonnement).
 *
 * ⚠️ IMPORTANT — sécurité :
 * - Un abonnement n'est JAMAIS activé depuis la redirection navigateur (success_url) :
 *   uniquement depuis ce webhook serveur-à-serveur, après vérification de signature.
 * - Signature obligatoire (WaveWebhookVerifier) : rejet 401 + log si invalide.
 * - Idempotence stricte via `wave_checkout_id` (unique) : un webhook déjà traité renvoie 200
 *   sans ré-appliquer les effets de bord.
 *
 * ⚠️ Le format exact du payload webhook Wave (enveloppe `type`/`data` ou objet de session brut,
 * noms exacts des champs `checkout_status`/`payment_status`/`transaction_id`) n'a pas pu être
 * re-vérifié dans cette session (pages Wave "Webhooks" inaccessibles). Le code ci-dessous gère
 * les deux formats les plus courants par défaut, mais DOIT être confirmé/ajusté avec un webhook
 * réel du Wave Business Portal (sandbox) avant mise en production.
 */
class WaveWebhookController extends Controller
{
    public function __construct(private readonly WaveWebhookVerifier $verifier)
    {
    }

    public function handle(Request $request)
    {
        $rawBody = $request->getContent();
        $signatureHeader = $request->header('Wave-Signature');
        $secret = config('services.wave.webhook_secret');

        $isValidSignature = $this->verifier->verify($signatureHeader, $rawBody, $secret);

        if (!$isValidSignature) {
            Log::channel('wave')->warning('Webhook Wave rejeté : signature invalide', [
                'ip'      => $request->ip(),
                'headers' => $request->header('Wave-Signature'),
                'payload' => $rawBody,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Signature invalide.',
            ], 401);
        }

        $payload = $request->json()->all();
        $sessionData = $payload['data'] ?? $payload;

        $sessionId = $sessionData['id'] ?? null;
        $checkoutStatus = $sessionData['checkout_status'] ?? null;
        $paymentStatus = $sessionData['payment_status'] ?? null;
        $transactionId = $sessionData['transaction_id'] ?? null;

        if ($sessionId === null) {
            Log::channel('wave')->warning('Webhook Wave reçu sans identifiant de session exploitable', [
                'payload' => $payload,
            ]);

            return response()->json(['success' => true]);
        }

        $invoice = Invoice::where('wave_checkout_id', $sessionId)->first();

        if ($invoice === null) {
            Log::channel('wave')->warning('Webhook Wave reçu pour une session inconnue', [
                'session_id' => $sessionId,
                'payload'    => $payload,
            ]);

            return response()->json(['success' => true]);
        }

        // Idempotence : facture déjà réglée, on ne ré-applique rien.
        if ($invoice->isPaid()) {
            Log::channel('wave')->info('Webhook Wave ignoré (facture déjà payée)', [
                'invoice_id' => $invoice->id,
                'session_id' => $sessionId,
            ]);

            return response()->json(['success' => true]);
        }

        $paymentSucceeded = $checkoutStatus === 'complete' && $paymentStatus === 'succeeded';

        $result = DB::transaction(function () use ($invoice, $paymentSucceeded, $transactionId) {
            $lockedInvoice = Invoice::lockForUpdate()->find($invoice->id);

            if ($lockedInvoice->isPaid()) {
                return 'already_paid';
            }

            if ($paymentSucceeded) {
                $lockedInvoice->markAsPaid($transactionId);

                $subscription = $lockedInvoice->subscription()->lockForUpdate()->first();
                if ($subscription !== null) {
                    $subscription->markAsActive(now(), now()->addMonth(), 'paiement_confirme_wave');
                }

                return 'activated';
            }

            $lockedInvoice->markAsFailed();

            return 'payment_failed';
        });

        Log::channel('wave')->info('Webhook Wave traité', [
            'invoice_id' => $invoice->id,
            'session_id' => $sessionId,
            'result'     => $result,
            'payload'    => $payload,
        ]);

        return response()->json(['success' => true]);
    }
}

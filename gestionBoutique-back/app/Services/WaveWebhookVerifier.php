<?php

namespace App\Services;

/**
 * Vérifie la signature des webhooks entrants de Wave.
 *
 * ⚠️ Schéma implémenté d'après la documentation Wave consultée (section "Request Signing",
 * docs.wave.com/business/) : en-tête `Wave-Signature: t={timestamp},v1={hmac_sha256}`.
 * Les pages dédiées "Webhooks" du site Wave n'ont pas pu être récupérées durant cette session
 * (404 sur toutes les tentatives). Ce schéma de signature est supposé identique à celui des
 * requêtes sortantes signées par Wave, ce qui est la convention la plus courante, mais DOIT être
 * revérifié dans le Wave Business Portal (section Webhooks du compte marchand) avant mise en
 * production, notamment le nom exact de l'en-tête et le format du payload signé.
 */
class WaveWebhookVerifier
{
    /** Tolérance sur l'ancienneté du timestamp (secondes), alignée sur la doc Wave (Request Signing). */
    private const MAX_TIMESTAMP_AGE_SECONDS = 300; // 5 minutes

    /** Tolérance sur un timestamp dans le futur (horloges légèrement désynchronisées). */
    private const MAX_TIMESTAMP_SKEW_SECONDS = 30;

    public function verify(?string $signatureHeader, string $rawBody, ?string $secret): bool
    {
        if ($signatureHeader === null || $signatureHeader === '' || $secret === null || $secret === '') {
            return false;
        }

        $parts = $this->parseSignatureHeader($signatureHeader);
        if ($parts === null) {
            return false;
        }

        [$timestamp, $signature] = $parts;

        if (!$this->isTimestampValid($timestamp)) {
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $timestamp . $rawBody, $secret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * @return array{0: string, 1: string}|null [timestamp, signature] ou null si format invalide.
     */
    private function parseSignatureHeader(string $header): ?array
    {
        $timestamp = null;
        $signature = null;

        foreach (explode(',', $header) as $segment) {
            $pair = explode('=', trim($segment), 2);
            if (count($pair) !== 2) {
                continue;
            }

            [$key, $value] = $pair;

            if ($key === 't') {
                $timestamp = $value;
            } elseif ($key === 'v1') {
                $signature = $value;
            }
        }

        if ($timestamp === null || $signature === null || !ctype_digit($timestamp)) {
            return null;
        }

        return [$timestamp, $signature];
    }

    private function isTimestampValid(string $timestamp): bool
    {
        $now = time();
        $ts = (int) $timestamp;

        if ($ts > $now + self::MAX_TIMESTAMP_SKEW_SECONDS) {
            return false;
        }

        if ($ts < $now - self::MAX_TIMESTAMP_AGE_SECONDS) {
            return false;
        }

        return true;
    }
}

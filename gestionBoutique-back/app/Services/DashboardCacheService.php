<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class DashboardCacheService
{
    /**
     * Préfixe de la clé stockant le timestamp de dernière invalidation
     * pour un patron donné.
     */
    private function versionKey(int $ownerId): string
    {
        return "dashboard_version_{$ownerId}";
    }

    /**
     * Récupère la version actuelle du cache dashboard pour ce patron.
     * Si aucune version n'existe encore, on en crée une (timestamp actuel).
     */
    public function getVersion(int $ownerId): int
    {
        return Cache::rememberForever(
            $this->versionKey($ownerId),
            fn () => now()->timestamp
        );
    }

    /**
     * Invalide le cache dashboard du patron en générant une nouvelle version.
     * À appeler après toute création/modification de vente, produit ou dépense.
     */
    public function invalidate(int $ownerId): void
    {
        Cache::forever($this->versionKey($ownerId), now()->timestamp);
    }

    /**
     * Construit une clé de cache versionnée pour les stats du dashboard.
     */
    public function buildKey(int $ownerId, string $period, ?string $startDate, ?string $endDate): string
    {
        $version = $this->getVersion($ownerId);

        return sprintf(
            'dashboard_stats_%d_v%d_%s_%s_%s',
            $ownerId,
            $version,
            $period,
            $startDate ?? '',
            $endDate ?? ''
        );
    }
}
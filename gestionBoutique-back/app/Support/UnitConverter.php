<?php

namespace App\Support;

class UnitConverter
{
    private const UNITS = [
        'piece'    => ['base' => 'piece', 'factors' => ['piece' => 1]],
        'masse'    => ['base' => 'g',     'factors' => ['g' => 1, 'kg' => 1000]],
        'volume'   => ['base' => 'ml',    'factors' => ['ml' => 1, 'L' => 1000]],
        'longueur' => ['base' => 'cm',    'factors' => ['cm' => 1, 'm' => 100]],
    ];

    public static function baseUnit(string $type): string
    {
        return self::UNITS[$type]['base']
            ?? throw new \InvalidArgumentException("Type d'unité inconnu : $type");
    }

    public static function factor(string $type, string $unit): float
    {
        return self::UNITS[$type]['factors'][$unit]
            ?? throw new \InvalidArgumentException("Unité '$unit' incompatible avec le type '$type'");
    }

    public static function compatibleUnits(string $type): array
    {
        return array_keys(self::UNITS[$type]['factors'] ?? []);
    }

    public static function isCompatible(string $type, string $unit): bool
    {
        return isset(self::UNITS[$type]['factors'][$unit]);
    }

    public static function toBase(string $type, string $unit, float $qty): float
    {
        return round($qty * self::factor($type, $unit), 3);
    }

    /** Prix par unité de base, à partir d'un prix exprimé dans $referenceUnit */
    public static function pricePerBase(string $type, string $referenceUnit, float $price): float
    {
        return $price / self::factor($type, $referenceUnit);
    }
}
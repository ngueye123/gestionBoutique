<?php

namespace App\Exceptions;

use RuntimeException;

class StockConflictException extends RuntimeException
{
    public function __construct(
        public readonly int|string $productId,
        public readonly string $productName,
        public readonly float $requested,
        public readonly float $available,
    ) {
        parent::__construct("Stock insuffisant pour {$productName}", 409);
    }
}
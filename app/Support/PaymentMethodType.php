<?php

namespace App\Support;

final class PaymentMethodType
{
    public static function isCod(?string $paymentMethod): bool
    {
        return strtolower(trim((string) $paymentMethod)) === 'cod';
    }
}

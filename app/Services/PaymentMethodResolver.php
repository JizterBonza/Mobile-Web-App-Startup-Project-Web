<?php

namespace App\Services;

use App\Models\PaymentMethod;

class PaymentMethodResolver
{
    public function resolveId(?string $providerMethod): ?int
    {
        $name = $this->normalize($providerMethod ?? '');
        if ($name === '') {
            return null;
        }

        // Inactive methods still identify payments completed through older sessions.
        $methods = PaymentMethod::query()->orderBy('id')->get(['id', 'name']);
        $exact = $methods->first(fn (PaymentMethod $method) => $this->normalize($method->name) === $name);
        if ($exact !== null) {
            return (int) $exact->id;
        }

        $aliases = match ($name) {
            'maya', 'paymaya' => ['maya', 'paymaya'],
            default => [],
        };
        $match = $methods->first(fn (PaymentMethod $method) => in_array($this->normalize($method->name), $aliases, true));

        return $match === null ? null : (int) $match->id;
    }

    private function normalize(string $name): string
    {
        return strtolower(preg_replace('/[^a-z0-9]+/i', '', $name));
    }
}

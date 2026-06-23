<?php

namespace App\Support;

class WeightConverter
{
    public static function toKg(float $weight, ?string $metric): float
    {
        return match (strtolower(trim($metric ?? 'kg'))) {
            'g' => $weight / 1000,
            'mg' => $weight / 1_000_000,
            'lb', 'lbs' => $weight * 0.453592,
            'oz' => $weight * 0.0283495,
            'ml' => $weight / 1000,
            'l' => $weight,
            'kg' => $weight,
            default => $weight,
        };
    }
}

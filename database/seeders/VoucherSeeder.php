<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Voucher;
use Illuminate\Database\Seeder;

class VoucherSeeder extends Seeder
{
    /**
     * Seed sample vouchers for mobile API testing.
     */
    public function run(): void
    {
        $createdBy = User::query()
            ->whereIn('user_type', ['super_admin', 'admin'])
            ->value('id');

        $samples = [
            [
                'code' => 'SAVE10',
                'name' => '10% Off Sample',
                'description' => 'Test percentage voucher — 10% off subtotal, max ₱100.',
                'type' => 'percentage_off',
                'discount_value' => 10,
                'minimum_order_amount' => 100,
                'maximum_discount' => 100,
                'usage_limit' => 100,
                'per_customer_limit' => 5,
            ],
            [
                'code' => 'FLAT50',
                'name' => '₱50 Off Sample',
                'description' => 'Test fixed-amount voucher — ₱50 off when subtotal ≥ ₱200.',
                'type' => 'fixed_amount_off',
                'discount_value' => 50,
                'minimum_order_amount' => 200,
                'maximum_discount' => null,
                'usage_limit' => 100,
                'per_customer_limit' => 5,
            ],
            [
                'code' => 'FREESHIP',
                'name' => 'Free Shipping Sample',
                'description' => 'Test free-shipping voucher — waives base + km shipping fee.',
                'type' => 'free_shipping',
                'discount_value' => null,
                'minimum_order_amount' => 0,
                'maximum_discount' => null,
                'usage_limit' => 100,
                'per_customer_limit' => 5,
            ],
            [
                'code' => 'EXPIRED1',
                'name' => 'Expired Sample',
                'description' => 'Should fail validation — already expired.',
                'type' => 'fixed_amount_off',
                'discount_value' => 20,
                'minimum_order_amount' => null,
                'maximum_discount' => null,
                'usage_limit' => null,
                'per_customer_limit' => null,
                'start_date' => now()->subDays(30),
                'end_date' => now()->subDay(),
                'status' => 'expired',
            ],
            [
                'code' => 'INACTIVE1',
                'name' => 'Inactive Sample',
                'description' => 'Should fail validation — inactive.',
                'type' => 'percentage_off',
                'discount_value' => 15,
                'minimum_order_amount' => null,
                'maximum_discount' => null,
                'usage_limit' => null,
                'per_customer_limit' => null,
                'status' => 'inactive',
            ],
        ];

        foreach ($samples as $sample) {
            $startDate = $sample['start_date'] ?? now()->subDay();
            $endDate = $sample['end_date'] ?? now()->addMonths(3);
            $requestedStatus = $sample['status'] ?? 'active';

            unset($sample['start_date'], $sample['end_date'], $sample['status']);

            Voucher::updateOrCreate(
                ['code' => $sample['code']],
                array_merge($sample, [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'status' => Voucher::resolveStatus($requestedStatus, $startDate, $endDate),
                    'usage_count' => 0,
                    'created_by' => $createdBy,
                ])
            );
        }
    }
}

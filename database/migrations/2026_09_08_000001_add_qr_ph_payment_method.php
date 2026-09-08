<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const NAME = 'QR Ph';

    public function up(): void
    {
        $existing = DB::table('payment_methods')
            ->get(['id', 'name'])
            ->first(fn ($paymentMethod) => $this->normalizeName($paymentMethod->name) === 'qrph');

        if ($existing) {
            DB::table('payment_methods')
                ->where('id', $existing->id)
                ->update([
                    'name' => self::NAME,
                    'status' => true,
                    'updated_at' => now(),
                ]);

            return;
        }

        DB::table('payment_methods')->insert([
            'name' => self::NAME,
            'status' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('payment_methods')
            ->where('name', self::NAME)
            ->delete();
    }

    private function normalizeName(string $name): string
    {
        return strtolower(preg_replace('/[^a-z0-9]+/i', '', $name));
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedBigInteger('order_id')->nullable()->change();
            $table->unsignedBigInteger('owner_user_id')->nullable()->index();
            $table->timestamp('last_reconciled_at')->nullable()->index();
        });
        Schema::table('order_details', function (Blueprint $table) {
            $table->boolean('checkout_is_cod')->nullable();
            $table->json('payment_snapshot')->nullable();
        });
        Schema::table('farm_orders', function (Blueprint $table) {
            $table->uuid('session_closure_key')->nullable();
            $table->timestamp('reservation_expires_at')->nullable()->index();
            $table->timestamp('reservation_expiry_notified_at')->nullable();
        });
        Schema::create('payment_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('provider_payment_id')->unique();
            $table->unsignedBigInteger('payment_id')->nullable()->index();
            $table->unsignedBigInteger('order_id')->nullable()->index();
            $table->unsignedBigInteger('amount_minor')->nullable();
            $table->string('currency', 10)->nullable();
            $table->string('status', 20)->index();
            $table->string('reason')->nullable();
            $table->json('payload');
            $table->timestamps();
        });
        Schema::create('payment_reviews', function (Blueprint $table) {
            $table->id();
            $table->string('fingerprint')->unique();
            $table->unsignedBigInteger('order_id')->nullable()->index();
            $table->unsignedBigInteger('payment_id')->nullable()->index();
            $table->unsignedBigInteger('shop_id')->nullable()->index();
            $table->string('reason')->index();
            $table->json('details')->nullable();
            $table->timestamp('resolved_at')->nullable()->index();
            $table->timestamps();
        });
        Schema::create('payment_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_id')->unique();
            $table->string('body_hash', 64);
            $table->string('status', 20)->default('pending')->index();
            $table->unsignedInteger('attempts')->default(0);
            $table->json('payload');
            $table->text('last_error')->nullable();
            $table->timestamps();
        });
        Schema::create('payment_method_bindings', function (Blueprint $table) {
            $table->string('provider_method_id')->primary();
            $table->unsignedBigInteger('owner_user_id')->index();
            $table->unsignedBigInteger('payment_id')->index();
            $table->timestamps();
        });

        // Historical choices are frozen once. Later API updates cannot change them.
        DB::table('order_details')->orderBy('id')->chunkById(200, function ($details) {
            foreach ($details as $detail) {
                $method = (string) ($detail->payment_method ?? '');
                if (ctype_digit($method) && Schema::hasTable('payment_methods')) {
                    $method = (string) DB::table('payment_methods')->where('id', $method)->value('name');
                }
                DB::table('order_details')->where('id', $detail->id)->update([
                    'checkout_is_cod' => strtolower(trim($method)) === 'cod',
                ]);
                foreach (DB::table('orders')->where('order_detail_id', $detail->id)->get() as $order) {
                    if (DB::table('farm_orders')->where('order_id', $order->id)->exists()) {
                        continue;
                    }
                    if (strtolower(trim($method)) === 'cod' && DB::table('payments')->where('order_id', $order->id)->exists()) {
                        DB::table('order_details')->where('id', $detail->id)->update(['checkout_is_cod' => false]);
                        $this->review('ambiguous_payment_choice', $order->id);
                    }
                    $items = Schema::hasTable('order_items') ? DB::table('order_items')->where('order_id', $order->id)->get() : collect();
                    $subtotal = $items->sum(fn ($item) => (int) round((float) $item->price_at_purchase * 100) * (int) $item->quantity);
                    $fees = 0;
                    foreach (['delivery_base_fee', 'delivery_km_fee', 'heavy_surcharge', 'multi_store_fee', 'mov_penalty_fee'] as $field) {
                        $fees += (int) round((float) ($detail->$field ?? 0) * 100);
                    }
                    $total = max(0, $subtotal + $fees - (int) round((float) ($detail->voucher_discount_amount ?? 0) * 100));
                    if ($items->isEmpty() || $subtotal !== (int) round((float) ($detail->subtotal ?? 0) * 100)
                        || $total !== (int) round((float) ($detail->total_amount ?? 0) * 100)) {
                        $this->review('order_snapshot_mismatch', $order->id);
                    } else {
                        DB::table('order_details')->where('id', $detail->id)->update([
                            'payment_snapshot' => json_encode(['subtotal_minor' => $subtotal, 'fees_minor' => $fees]),
                        ]);
                    }
                }
            }
        });
        DB::table('payments')->orderBy('id')->chunkById(200, function ($payments) {
            foreach ($payments as $payment) {
                DB::table('payments')->where('id', $payment->id)->update([
                    'owner_user_id' => DB::table('orders')->where('id', $payment->order_id)->value('user_id'),
                    'attempt_key' => $payment->attempt_key ?: (string) Str::uuid(),
                ]);
                $metadata = json_decode($payment->metadata ?? '{}', true);
                if (! empty($metadata['previous_checkout_session_ids'])) {
                    $this->review('legacy_overlapping_sessions', $payment->order_id, $payment->id);
                }
            }
        });
        DB::table('farm_orders')->whereNull('deposit_paid_at')->whereNull('cancelled_at')
            ->orderBy('id')->chunkById(200, function ($orders) {
                foreach ($orders as $order) {
                    DB::table('farm_orders')->where('id', $order->id)->update([
                        'reservation_expires_at' => \Illuminate\Support\Carbon::parse($order->created_at)->addHours(24),
                    ]);
                }
            });
    }

    private function review(string $reason, ?int $orderId, ?int $paymentId = null): void
    {
        DB::table('payment_reviews')->insertOrIgnore([
            'fingerprint' => hash('sha256', json_encode([$reason, $orderId, $paymentId, null, []])),
            'reason' => $reason, 'order_id' => $orderId, 'payment_id' => $paymentId,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        // Financial evidence and ownership must survive an application rollback.
        throw new RuntimeException('Payment security migrations are forward-only. Retain financial records and deploy a corrective migration.');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            if (! Schema::hasColumn('shops', 'wallet_balance')) {
                $table->decimal('wallet_balance', 12, 2)->default(0)->after('account_number');
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            if (! Schema::hasColumn('order_items', 'wallet_credited_at')) {
                $table->timestamp('wallet_credited_at')->nullable()->after('item_status');
            }
        });

        if (! Schema::hasTable('shop_wallet_transactions')) {
            Schema::create('shop_wallet_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('shop_id')->constrained('shops')->cascadeOnDelete();
                $table->string('type', 20);
                $table->decimal('amount', 12, 2);
                $table->decimal('balance_after', 12, 2);
                $table->string('reason', 30);
                $table->foreignId('order_item_id')->nullable()->constrained('order_items')->nullOnDelete();
                $table->unsignedBigInteger('payout_id')->nullable();
                $table->timestamps();

                $table->index(['shop_id', 'created_at']);
            });
        }

        $this->backfillDeliveredSales();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shop_wallet_transactions');

        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'wallet_credited_at')) {
                $table->dropColumn('wallet_credited_at');
            }
        });

        Schema::table('shops', function (Blueprint $table) {
            if (Schema::hasColumn('shops', 'wallet_balance')) {
                $table->dropColumn('wallet_balance');
            }
        });
    }

    private function backfillDeliveredSales(): void
    {
        if (! Schema::hasTable('order_item_status') || ! Schema::hasTable('order_status')) {
            return;
        }

        $deliveredItemStatusId = DB::table('order_item_status')
            ->where('stat_description', 'Delivered')
            ->value('id');
        $deliveredOrderStatusId = DB::table('order_status')
            ->where('stat_description', 'Delivered')
            ->value('id');

        $items = DB::table('order_items')
            ->whereNull('wallet_credited_at')
            ->where(function ($query) use ($deliveredItemStatusId, $deliveredOrderStatusId) {
                if ($deliveredItemStatusId) {
                    $query->where('item_status', $deliveredItemStatusId);
                }
                if ($deliveredOrderStatusId) {
                    $query->orWhereExists(function ($sub) use ($deliveredOrderStatusId) {
                        $sub->selectRaw('1')
                            ->from('order_shops')
                            ->whereColumn('order_shops.order_id', 'order_items.order_id')
                            ->whereColumn('order_shops.shop_id', 'order_items.shop_id')
                            ->where('order_shops.order_status', $deliveredOrderStatusId);
                    });
                }
            })
            ->get();

        $now = now();

        foreach ($items as $item) {
            $amount = round(max(0, ((float) $item->quantity * (float) $item->price_at_purchase) - (float) ($item->platform_fee ?? 0)), 2);
            if ($amount < 0.01 || ! $item->shop_id) {
                continue;
            }

            $shop = DB::table('shops')->where('id', $item->shop_id)->first();
            if (! $shop) {
                continue;
            }

            $balance = round((float) $shop->wallet_balance + $amount, 2);

            DB::table('shops')->where('id', $item->shop_id)->update(['wallet_balance' => $balance]);
            DB::table('order_items')->where('id', $item->id)->update(['wallet_credited_at' => $now]);
            DB::table('shop_wallet_transactions')->insert([
                'shop_id' => $item->shop_id,
                'type' => 'credit',
                'amount' => $amount,
                'balance_after' => $balance,
                'reason' => 'sale',
                'order_item_id' => $item->id,
                'payout_id' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
};

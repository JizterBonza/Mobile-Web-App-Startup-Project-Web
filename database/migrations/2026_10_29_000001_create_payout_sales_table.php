<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sales whose wallet credits are included in a payout.
     */
    public function up(): void
    {
        if (Schema::hasTable('payout_sales')) {
            return;
        }

        Schema::create('payout_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payout_id')->constrained('payouts')->cascadeOnDelete();
            $table->foreignId('shop_wallet_transaction_id')->constrained('shop_wallet_transactions')->cascadeOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained('order_items')->nullOnDelete();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->decimal('amount', 12, 2);
            $table->timestamps();

            $table->unique(['payout_id', 'shop_wallet_transaction_id']);
            $table->index(['payout_id', 'order_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_sales');
    }
};

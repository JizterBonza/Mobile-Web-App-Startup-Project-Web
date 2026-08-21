<?php

use App\Services\ShopWalletService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Platform fees are paid by the customer. Top up any sale credits that
     * previously deducted that fee from the vendor wallet.
     */
    public function up(): void
    {
        app(ShopWalletService::class)->reconcileSaleCredits();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Historical sale amounts are not restored; wallet credits stay at full sale value.
    }
};

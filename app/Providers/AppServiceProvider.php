<?php

namespace App\Providers;

use App\Models\OrderItem;
use App\Services\ShopWalletService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        OrderItem::updated(function (OrderItem $item) {
            if ($item->wasChanged('item_status')) {
                app(ShopWalletService::class)->creditFromOrderItem($item);
            }
        });
    }
}

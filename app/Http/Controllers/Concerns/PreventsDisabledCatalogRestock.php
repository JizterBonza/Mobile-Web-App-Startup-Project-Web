<?php

namespace App\Http\Controllers\Concerns;

use App\Models\ProductCatalog;

trait PreventsDisabledCatalogRestock
{
    protected function catalogRestockBlockedMessage(): string
    {
        return ProductCatalog::RESTOCK_BLOCKED_MESSAGE;
    }

    protected function isCatalogRestockBlocked(object $item, $newQuantity): bool
    {
        $current = (int) ($item->item_quantity ?? 0);
        if ((int) $newQuantity <= $current) {
            return false;
        }

        return ProductCatalog::restockBlockedForItem($item);
    }
}

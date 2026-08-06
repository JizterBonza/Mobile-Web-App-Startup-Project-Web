<?php

use App\Models\Shop;
use App\Models\ShopConversation;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('shop-conversation.{conversationId}', function (User $user, int $conversationId) {
    $conversation = ShopConversation::query()
        ->with('shop:id,agrivet_id')
        ->find($conversationId);

    if (! $conversation || ! $conversation->shop) {
        return false;
    }

    if ((int) $user->id === (int) $conversation->customer_user_id) {
        return true;
    }

    if ($user->user_type === User::TYPE_OWNER_MANAGER) {
        return (int) $user->agrivet_id === (int) $conversation->shop->agrivet_id;
    }

    if ($user->user_type === User::TYPE_VENDOR) {
        return $user->shops()->where('shops.id', $conversation->shop_id)->exists();
    }

    return false;
});

Broadcast::channel('shop.{shopId}', function (User $user, int $shopId) {
    $shop = Shop::query()->find($shopId, ['id', 'agrivet_id']);

    if (! $shop) {
        return false;
    }

    if ($user->user_type === User::TYPE_OWNER_MANAGER) {
        return (int) $user->agrivet_id === (int) $shop->agrivet_id;
    }

    if ($user->user_type === User::TYPE_VENDOR) {
        return $user->shops()->where('shops.id', $shop->id)->exists();
    }

    return false;
});

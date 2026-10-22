<?php

namespace App\Events;

use App\Models\ShopConversation;
use App\Models\ShopConversationMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShopMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<int, int>  $recipientUserIds
     */
    public function __construct(
        public ShopConversation $conversation,
        public ShopConversationMessage $message,
        public array $payload,
        public array $recipientUserIds = [],
    ) {}

    /**
     * Conversation, shop, farm, and each participant's user channel.
     *
     * @param  array<int, int>  $recipientUserIds
     * @return array<int, \Illuminate\Broadcasting\PrivateChannel>
     */
    public static function channelsFor(ShopConversation $conversation, array $recipientUserIds): array
    {
        $channels = [
            new PrivateChannel('shop-conversation.'.$conversation->id),
        ];

        foreach (array_unique($recipientUserIds) as $userId) {
            if ($userId) {
                $channels[] = new PrivateChannel('App.Models.User.'.$userId);
            }
        }

        if ($conversation->shop_id) {
            $channels[] = new PrivateChannel('shop.'.$conversation->shop_id);
        }

        if ($conversation->farm_id) {
            $channels[] = new PrivateChannel('farm.'.$conversation->farm_id);
        }

        return $channels;
    }

    /**
     * @return array<int, \Illuminate\Broadcasting\PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return self::channelsFor($this->conversation, $this->recipientUserIds);
    }

    public function broadcastAs(): string
    {
        return 'shop.message.sent';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}

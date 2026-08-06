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
     */
    public function __construct(
        public ShopConversation $conversation,
        public ShopConversationMessage $message,
        public array $payload,
    ) {}

    /**
     * @return array<int, \Illuminate\Broadcasting\PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('shop-conversation.'.$this->conversation->id),
            new PrivateChannel('shop.'.$this->conversation->shop_id),
        ];
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

<?php

namespace App\Events;

use App\Models\ShopConversation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShopConversationRead implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<int, int>  $recipientUserIds
     */
    public function __construct(
        public ShopConversation $conversation,
        public int $readerUserId,
        public string $readerRole,
        public string $lastReadAt,
        public array $recipientUserIds,
        public string $lastSeen,
    ) {}

    /**
     * @return array<int, \Illuminate\Broadcasting\PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return ShopMessageSent::channelsFor($this->conversation, $this->recipientUserIds);
    }

    public function broadcastAs(): string
    {
        return 'shop.conversation.read';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'conversation_id' => (int) $this->conversation->id,
            'shop_id' => $this->conversation->shop_id ? (int) $this->conversation->shop_id : null,
            'farm_id' => $this->conversation->farm_id ? (int) $this->conversation->farm_id : null,
            'reader_user_id' => $this->readerUserId,
            'reader_role' => $this->readerRole,
            'last_read_at' => $this->lastReadAt,
            'last_seen' => $this->lastSeen,
        ];
    }
}

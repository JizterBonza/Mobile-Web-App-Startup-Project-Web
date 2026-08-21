<?php

namespace App\Services;

use App\Events\ShopMessageSent;
use App\Models\Item;
use App\Models\Notification;
use App\Models\OrderItem;
use App\Models\Shop;
use App\Models\ShopConversation;
use App\Models\ShopConversationAttachment;
use App\Models\ShopConversationMessage;
use App\Models\ShopConversationRead;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ShopMessagingService
{
    /**
     * Branches for an owner/manager with unread conversation counts.
     *
     * @param  Collection<int, Shop>  $shops
     * @return Collection<int, array<string, mixed>>
     */
    public function formatBranches(Collection $shops, User $viewer): Collection
    {
        if ($shops->isEmpty()) {
            return collect();
        }

        $shopIds = $shops->pluck('id')->all();
        $unreadByShop = $this->unreadConversationCountsByShop($shopIds, $viewer->id);

        return $shops->map(function (Shop $shop) use ($unreadByShop) {
            $address = collect([
                $shop->shop_address,
                $shop->shop_city,
                $shop->shop_province,
                $shop->shop_postal_code,
            ])->filter()->implode(', ');

            return [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
                'shop_address' => $address,
                'unread_count' => (int) ($unreadByShop[$shop->id] ?? 0),
            ];
        })->values();
    }

    /**
     * Conversation list items for a shop, relative to the staff viewer.
     *
     * @return list<array<string, mixed>>
     */
    public function formatConversationList(Shop $shop, User $viewer): array
    {
        $conversations = ShopConversation::query()
            ->where('shop_id', $shop->id)
            ->with(['customer.userDetail'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get();

        if ($conversations->isEmpty()) {
            return [];
        }

        $unreadMap = $this->unreadFlagsForConversations($conversations, $viewer->id);
        $lastMessages = $this->latestMessagesForConversations($conversations);

        return $conversations->map(function (ShopConversation $conversation) use ($unreadMap, $lastMessages) {
            return [
                'id' => $conversation->id,
                'name' => $this->displayName($conversation->customer),
                'avatar_url' => $this->avatarUrl($conversation->customer),
                'last_message' => $conversation->last_message_preview ?: 'No messages yet',
                'last_sender' => $this->formatLastSender($lastMessages->get($conversation->id)),
                'timestamp' => $this->listTimestamp($conversation->last_message_at),
                'unread' => (bool) ($unreadMap[$conversation->id] ?? false),
            ];
        })->values()->all();
    }

    /**
     * Conversation list for a customer, with unread flags for staff replies.
     *
     * @return array{conversations: list<array<string, mixed>>, unread_count: int}
     */
    public function formatCustomerConversationList(User $customer): array
    {
        $conversations = $this->customerConversations($customer);

        if ($conversations->isEmpty()) {
            return [
                'conversations' => [],
                'unread_count' => 0,
            ];
        }

        $unreadMap = $this->unreadFlagsForCustomerConversations($conversations, $customer->id);
        $lastMessages = $this->latestMessagesForConversations($conversations);

        $items = $conversations->map(function (ShopConversation $conversation) use ($unreadMap, $lastMessages) {
            return [
                'id' => $conversation->id,
                'shop_id' => $conversation->shop_id,
                'shop_name' => $conversation->shop?->shop_name,
                'last_message' => $conversation->last_message_preview,
                'last_message_at' => $conversation->last_message_at?->toIso8601String(),
                'last_sender' => $this->formatLastSender($lastMessages->get($conversation->id)),
                'unread' => (bool) ($unreadMap[$conversation->id] ?? false),
            ];
        })->values()->all();

        return [
            'conversations' => $items,
            'unread_count' => $this->countUnreadFlags($unreadMap),
        ];
    }

    public function unreadCountForCustomer(User $customer): int
    {
        $conversations = $this->customerConversations($customer, withShop: false);
        if ($conversations->isEmpty()) {
            return 0;
        }

        return $this->countUnreadFlags(
            $this->unreadFlagsForCustomerConversations($conversations, $customer->id)
        );
    }

    /**
     * Header + thread payload for a conversation page.
     *
     * @return array{conversation: array<string, mixed>, messages: list<array<string, mixed>>}
     */
    public function formatConversationThread(ShopConversation $conversation, User $viewer): array
    {
        $conversation->loadMissing([
            'customer.userDetail',
            'messages.sender.userDetail',
            'messages.attachments',
        ]);

        $this->markRead($conversation, $viewer);

        return [
            'conversation' => [
                'id' => $conversation->id,
                'name' => $this->displayName($conversation->customer),
                'avatar_url' => $this->avatarUrl($conversation->customer),
                'last_seen' => $this->lastSeenLabel($conversation),
            ],
            'messages' => $this->formatMessages($conversation->messages, $viewer),
        ];
    }

    /**
     * Find or create a shop–customer conversation.
     */
    public function findOrCreate(Shop $shop, User $customer): ShopConversation
    {
        return ShopConversation::firstOrCreate(
            [
                'shop_id' => $shop->id,
                'customer_user_id' => $customer->id,
            ],
            [
                'last_message_at' => null,
                'last_message_preview' => null,
            ]
        );
    }

    /**
     * Persist a staff (or customer) message with optional file uploads.
     *
     * @param  array<int, UploadedFile>  $files
     */
    public function sendMessage(
        ShopConversation $conversation,
        User $sender,
        string $body,
        array $files = []
    ): ShopConversationMessage {
        $sender->loadMissing('userDetail');
        $role = $this->senderRole($sender);
        $trimmedBody = trim($body);
        $type = $this->resolveMessageType($files, $trimmedBody);

        $message = DB::transaction(function () use ($conversation, $sender, $role, $type, $trimmedBody, $files) {
            $message = ShopConversationMessage::create([
                'shop_conversation_id' => $conversation->id,
                'sender_user_id' => $sender->id,
                'sender_role' => $role,
                'type' => $type,
                'body' => $trimmedBody !== '' ? $trimmedBody : null,
            ]);

            $this->storeAttachments($message, $conversation->id, $files);

            $preview = $this->buildPreview($message->fresh('attachments'), $trimmedBody);
            $conversation->update([
                'last_message_at' => now(),
                'last_message_preview' => $preview,
            ]);

            $this->markRead($conversation, $sender);

            return $message->fresh(['attachments', 'sender.userDetail']);
        });

        $this->broadcastMessage($conversation->fresh(), $message);

        return $message;
    }

    /**
     * Share a shop listing as a product message (snapshot stored in metadata).
     */
    public function sendProductMessage(
        ShopConversation $conversation,
        User $sender,
        Item $item,
        string $body = ''
    ): ShopConversationMessage {
        if ((int) $item->shop_id !== (int) $conversation->shop_id) {
            abort(422, 'Product does not belong to this shop.');
        }

        return $this->sendProductSnapshotMessage(
            $conversation,
            $sender,
            $this->productMetadataFromItem($item),
            $body,
        );
    }

    /**
     * Share a product snapshot (order item or listing) as a product message.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function sendProductSnapshotMessage(
        ShopConversation $conversation,
        User $sender,
        array $metadata,
        string $body = '',
        bool $notify = true,
    ): ShopConversationMessage {
        $sender->loadMissing('userDetail');
        $role = $this->senderRole($sender);
        $trimmedBody = trim($body);

        $message = DB::transaction(function () use ($conversation, $sender, $role, $trimmedBody, $metadata) {
            $message = ShopConversationMessage::create([
                'shop_conversation_id' => $conversation->id,
                'sender_user_id' => $sender->id,
                'sender_role' => $role,
                'type' => ShopConversationMessage::TYPE_PRODUCT,
                'body' => $trimmedBody !== '' ? $trimmedBody : null,
                'metadata' => $metadata,
            ]);

            $preview = $this->buildPreview($message, $trimmedBody);
            $conversation->update([
                'last_message_at' => now(),
                'last_message_preview' => $preview,
            ]);

            $this->markRead($conversation, $sender);

            return $message->fresh(['attachments', 'sender.userDetail']);
        });

        if ($notify) {
            $this->notifyCounterpart($conversation, $sender, $message);
        }
        $this->broadcastMessage($conversation->fresh(), $message);

        return $message;
    }

    /**
     * Send a single order-status update that includes product cards and a total.
     *
     * @param  list<array<string, mixed>>  $products
     * @param  array<string, mixed>  $extra
     */
    public function sendOrderUpdateMessage(
        ShopConversation $conversation,
        User $sender,
        string $body,
        array $products = [],
        ?float $total = null,
        array $extra = [],
    ): ShopConversationMessage {
        $sender->loadMissing('userDetail');
        $role = $this->senderRole($sender);
        $trimmedBody = trim($body);
        $metadata = array_merge($extra, [
            'products' => array_values($products),
            'total' => $total,
        ]);

        $message = DB::transaction(function () use ($conversation, $sender, $role, $trimmedBody, $metadata) {
            $message = ShopConversationMessage::create([
                'shop_conversation_id' => $conversation->id,
                'sender_user_id' => $sender->id,
                'sender_role' => $role,
                'type' => ShopConversationMessage::TYPE_ORDER_UPDATE,
                'body' => $trimmedBody !== '' ? $trimmedBody : null,
                'metadata' => $metadata,
            ]);

            $preview = $this->buildPreview($message, $trimmedBody);
            $conversation->update([
                'last_message_at' => now(),
                'last_message_preview' => $preview,
            ]);

            $this->markRead($conversation, $sender);

            return $message->fresh(['attachments', 'sender.userDetail']);
        });

        $this->notifyCounterpart($conversation, $sender, $message);
        $this->broadcastMessage($conversation->fresh(), $message);

        return $message;
    }

    /**
     * Active shop listings for the messaging product picker.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listShopProductsForPicker(Shop $shop, ?string $search = null): array
    {
        $query = Item::query()
            ->where('shop_id', $shop->id)
            ->where('item_status', 'active')
            ->orderBy('item_name');

        $term = trim((string) $search);
        if ($term !== '') {
            $query->where('item_name', 'like', '%'.$term.'%');
        }

        return $query->get()->map(function (Item $item) {
            $metadata = $this->productMetadataFromItem($item);

            return [
                'id' => $item->id,
                'item_name' => $metadata['product_name'],
                'item_price' => $metadata['item_price'],
                'effective_price' => $metadata['effective_price'],
                'active_discount_percent' => $metadata['active_discount_percent'],
                'image_url' => $metadata['image_url'],
                'unit_label' => $metadata['unit_label'],
                'weight' => $metadata['weight'],
                'metric' => $metadata['metric'],
                'item_quantity' => $metadata['item_quantity'],
            ];
        })->values()->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function productMetadataFromItem(Item $item): array
    {
        $itemPrice = round((float) $item->item_price, 2);
        $effectivePrice = $item->getEffectivePrice();
        $discount = $item->getActiveDiscountPercent();

        return [
            'item_id' => (int) $item->id,
            'product_name' => (string) $item->item_name,
            'item_price' => $itemPrice,
            'effective_price' => $effectivePrice,
            'active_discount_percent' => $discount,
            'image_url' => $this->itemImageUrl($item),
            'unit_label' => $this->itemUnitLabel($item),
            'weight' => $item->weight !== null ? (float) $item->weight : null,
            'metric' => $item->metric,
            'item_quantity' => (int) $item->item_quantity,
            'item_status' => $item->item_status,
            'is_bundle' => (bool) $item->is_bundle,
        ];
    }

    /**
     * Product card snapshot from an order line (image, paid price, ordered qty, line total).
     *
     * @return array<string, mixed>
     */
    public function productMetadataFromOrderItem(OrderItem $orderItem): array
    {
        $orderItem->loadMissing('item');
        $item = $orderItem->item;
        $base = $item ? $this->productMetadataFromItem($item) : [
            'item_id' => (int) $orderItem->item_id,
            'product_name' => 'Item',
            'item_price' => 0.0,
            'effective_price' => 0.0,
            'active_discount_percent' => 0.0,
            'image_url' => null,
            'unit_label' => null,
            'weight' => null,
            'metric' => null,
            'item_quantity' => 0,
            'item_status' => null,
            'is_bundle' => false,
        ];

        $name = trim((string) ($orderItem->item_name_at_purchase ?? ''));
        if ($name === '') {
            $name = trim((string) ($base['product_name'] ?? 'Item'));
        }

        $unitPrice = round((float) $orderItem->price_at_purchase, 2);
        $listPrice = round((float) ($orderItem->original_price ?? $orderItem->price_at_purchase), 2);
        $quantity = max(0, (int) $orderItem->quantity);
        $discount = (float) ($orderItem->discount_percent_at_purchase ?? 0);

        return array_merge($base, [
            'item_id' => (int) ($orderItem->item_id ?: ($base['item_id'] ?? 0)),
            'product_name' => $name !== '' ? $name : 'Item',
            'item_price' => $listPrice,
            'effective_price' => $unitPrice,
            'active_discount_percent' => $discount,
            'quantity' => $quantity,
            'line_total' => round($unitPrice * $quantity, 2),
            'order_id' => (int) $orderItem->order_id,
            'order_item_id' => (int) $orderItem->id,
        ]);
    }

    private function itemImageUrl(Item $item): ?string
    {
        $images = $item->item_images;
        if (is_string($images)) {
            $decoded = json_decode($images, true);
            $images = is_array($decoded) ? $decoded : [];
        }
        if (! is_array($images) || $images === []) {
            return null;
        }

        $image = $images[0] ?? null;
        if (! is_string($image) || $image === '') {
            return null;
        }

        if (preg_match('/^https?:\/\//', $image)) {
            return $image;
        }

        if (str_starts_with($image, '/storage/')) {
            return $image;
        }

        if (str_contains($image, 'products/')) {
            return '/storage/'.ltrim($image, '/');
        }

        return '/storage/products/'.basename($image);
    }

    private function itemUnitLabel(Item $item): ?string
    {
        $weight = $item->weight;
        $metric = is_string($item->metric) ? trim($item->metric) : '';

        if ($weight === null || $weight === '' || (float) $weight <= 0) {
            return $metric !== '' ? $metric : null;
        }

        $formatted = rtrim(rtrim(number_format((float) $weight, 2, '.', ''), '0'), '.');

        return $metric !== '' ? $formatted.$metric : $formatted;
    }

    /**
     * Viewer-neutral payload for WebSocket clients (side resolved on the client).
     *
     * @return array<string, mixed>
     */
    public function formatBroadcastPayload(
        ShopConversation $conversation,
        ShopConversationMessage $message
    ): array {
        $message->loadMissing(['attachments', 'sender.userDetail']);
        $conversation->loadMissing(['customer.userDetail']);

        $createdAt = $message->created_at ?? now();

        $formatted = [
            'id' => $message->id,
            'type' => $message->type,
            'sender_user_id' => (int) $message->sender_user_id,
            'sender_role' => $message->sender_role,
            'sent_by' => $this->displayName($message->sender),
            'time' => $createdAt->format('g.i A'),
            'created_at' => $createdAt->toIso8601String(),
            'date_key' => $createdAt->toDateString(),
            'date_label' => $this->dateSeparatorLabel($createdAt),
        ];

        $attachments = $message->attachments ?? collect();

        if ($message->type === ShopConversationMessage::TYPE_IMAGES) {
            $formatted['caption'] = $message->body ?? '';
            $formatted['images'] = $attachments
                ->filter(fn (ShopConversationAttachment $a) => $a->isImage())
                ->map(fn (ShopConversationAttachment $a) => $a->url)
                ->values()
                ->all();
        } elseif ($message->type === ShopConversationMessage::TYPE_FILE) {
            $file = $attachments->first();
            $formatted['file_name'] = $file?->file_name ?? 'Attachment';
            $formatted['file_label'] = $this->fileLabel($file?->mime_type);
            $formatted['file_size'] = $this->humanFileSize((int) ($file?->file_size ?? 0));
            $formatted['file_url'] = $file?->url;
        } elseif ($message->type === ShopConversationMessage::TYPE_PRODUCT) {
            $formatted['body'] = $message->body ?? '';
            $formatted['product'] = $message->metadata;
        } elseif ($message->type === ShopConversationMessage::TYPE_ORDER_UPDATE) {
            $formatted['body'] = $message->body ?? '';
            $formatted['products'] = $message->metadata['products'] ?? [];
            $formatted['total'] = $message->metadata['total'] ?? null;
        } else {
            $formatted['body'] = $message->body ?? '';
        }

        return [
            'conversation_id' => (int) $conversation->id,
            'shop_id' => (int) $conversation->shop_id,
            'message' => $formatted,
            'preview' => [
                'name' => $this->displayName($conversation->customer),
                'avatar_url' => $this->avatarUrl($conversation->customer),
                'last_message' => $conversation->last_message_preview ?: 'New message',
                'last_sender' => $this->formatLastSender($message),
                'timestamp' => $this->listTimestamp($conversation->last_message_at),
            ],
        ];
    }

    private function broadcastMessage(
        ShopConversation $conversation,
        ShopConversationMessage $message
    ): void {
        broadcast(new ShopMessageSent(
            $conversation,
            $message,
            $this->formatBroadcastPayload($conversation, $message),
        ));
    }

    public function markRead(ShopConversation $conversation, User $user): void
    {
        ShopConversationRead::updateOrCreate(
            [
                'shop_conversation_id' => $conversation->id,
                'user_id' => $user->id,
            ],
            [
                'last_read_at' => now(),
            ]
        );
    }

    public function assertOwnerManagerShopAccess(User $user, int $shopId): Shop
    {
        $agrivet = $user->managedAgrivet;
        if (! $agrivet) {
            abort(403, 'No agrivet assigned to this account.');
        }

        return $agrivet->shops()->where('id', $shopId)->firstOrFail();
    }

    public function assertVendorShopAccess(User $user, Shop $shop): void
    {
        $assigned = $user->shops()->where('shops.id', $shop->id)->exists();
        if (! $assigned) {
            abort(403, 'You are not assigned to this shop.');
        }
    }

    public function findConversationForShop(Shop $shop, int $conversationId): ShopConversation
    {
        return ShopConversation::query()
            ->where('shop_id', $shop->id)
            ->where('id', $conversationId)
            ->firstOrFail();
    }

    /**
     * @param  Collection<int, ShopConversationMessage>  $messages
     * @return list<array<string, mixed>>
     */
    private function formatMessages(Collection $messages, User $viewer): array
    {
        $formatted = [];
        $lastDateKey = null;

        foreach ($messages as $message) {
            $createdAt = $message->created_at ?? now();
            $dateKey = $createdAt->toDateString();

            if ($dateKey !== $lastDateKey) {
                $formatted[] = [
                    'id' => 'date-'.$dateKey,
                    'type' => 'date',
                    'label' => $this->dateSeparatorLabel($createdAt),
                ];
                $lastDateKey = $dateKey;
            }

            $formatted[] = $this->formatSingleMessage($message, $viewer);
        }

        return $formatted;
    }

    /**
     * @return array<string, mixed>
     */
    private function formatSingleMessage(ShopConversationMessage $message, User $viewer): array
    {
        // Staff shared inbox: customer = incoming, any staff message = outgoing.
        if (in_array($viewer->user_type, [User::TYPE_VENDOR, User::TYPE_OWNER_MANAGER], true)) {
            $isOutgoing = $message->isStaffMessage();
        } else {
            $isOutgoing = (int) $message->sender_user_id === (int) $viewer->id;
        }

        $base = [
            'id' => $message->id,
            'type' => $message->type,
            'side' => $isOutgoing ? 'outgoing' : 'incoming',
            'time' => $message->created_at?->format('g.i A') ?? '',
        ];

        if ($isOutgoing) {
            $base['sent_by'] = $this->displayName($message->sender);
            $base['status'] = 'read';
        }

        $attachments = $message->attachments ?? collect();

        if ($message->type === ShopConversationMessage::TYPE_IMAGES) {
            $base['caption'] = $message->body ?? '';
            $base['images'] = $attachments
                ->filter(fn (ShopConversationAttachment $a) => $a->isImage())
                ->map(fn (ShopConversationAttachment $a) => $a->url)
                ->values()
                ->all();

            return $base;
        }

        if ($message->type === ShopConversationMessage::TYPE_FILE) {
            $file = $attachments->first();
            $base['file_name'] = $file?->file_name ?? 'Attachment';
            $base['file_label'] = $this->fileLabel($file?->mime_type);
            $base['file_size'] = $this->humanFileSize((int) ($file?->file_size ?? 0));
            $base['file_url'] = $file?->url;

            return $base;
        }

        if ($message->type === ShopConversationMessage::TYPE_PRODUCT) {
            $base['body'] = $message->body ?? '';
            $base['product'] = $message->metadata;

            return $base;
        }

        if ($message->type === ShopConversationMessage::TYPE_ORDER_UPDATE) {
            $base['body'] = $message->body ?? '';
            $base['products'] = $message->metadata['products'] ?? [];
            $base['total'] = $message->metadata['total'] ?? null;

            return $base;
        }

        $base['body'] = $message->body ?? '';

        return $base;
    }

    /**
     * @param  array<int, int>  $shopIds
     * @return array<int, int> shop_id => unread conversation count
     */
    private function unreadConversationCountsByShop(array $shopIds, int $viewerId): array
    {
        $conversations = ShopConversation::query()
            ->whereIn('shop_id', $shopIds)
            ->get(['id', 'shop_id']);

        if ($conversations->isEmpty()) {
            return [];
        }

        $flags = $this->unreadFlagsForConversations($conversations, $viewerId);
        $counts = [];

        foreach ($conversations as $conversation) {
            if (! ($flags[$conversation->id] ?? false)) {
                continue;
            }
            $counts[$conversation->shop_id] = ($counts[$conversation->shop_id] ?? 0) + 1;
        }

        return $counts;
    }

    /**
     * @param  Collection<int, ShopConversation>  $conversations
     * @return array<int, bool>
     */
    private function unreadFlagsForConversations(Collection $conversations, int $viewerId): array
    {
        $ids = $conversations->pluck('id')->all();
        if ($ids === []) {
            return [];
        }

        $reads = ShopConversationRead::query()
            ->where('user_id', $viewerId)
            ->whereIn('shop_conversation_id', $ids)
            ->pluck('last_read_at', 'shop_conversation_id');

        $latestCustomerMessage = ShopConversationMessage::query()
            ->select('shop_conversation_id', DB::raw('MAX(created_at) as latest_at'))
            ->whereIn('shop_conversation_id', $ids)
            ->where('sender_role', ShopConversationMessage::ROLE_CUSTOMER)
            ->groupBy('shop_conversation_id')
            ->pluck('latest_at', 'shop_conversation_id');

        $flags = [];
        foreach ($ids as $id) {
            $latest = $latestCustomerMessage[$id] ?? null;
            if (! $latest) {
                $flags[$id] = false;
                continue;
            }

            $lastRead = $reads[$id] ?? null;
            if (! $lastRead) {
                $flags[$id] = true;
                continue;
            }

            $flags[$id] = Carbon::parse($latest)->gt(Carbon::parse($lastRead));
        }

        return $flags;
    }

    /**
     * @param  Collection<int, ShopConversation>  $conversations
     * @return array<int, bool>
     */
    private function unreadFlagsForCustomerConversations(Collection $conversations, int $customerUserId): array
    {
        $ids = $conversations->pluck('id')->all();
        if ($ids === []) {
            return [];
        }

        $reads = ShopConversationRead::query()
            ->where('user_id', $customerUserId)
            ->whereIn('shop_conversation_id', $ids)
            ->pluck('last_read_at', 'shop_conversation_id');

        $latestStaffMessage = ShopConversationMessage::query()
            ->select('shop_conversation_id', DB::raw('MAX(created_at) as latest_at'))
            ->whereIn('shop_conversation_id', $ids)
            ->whereIn('sender_role', [
                ShopConversationMessage::ROLE_VENDOR,
                ShopConversationMessage::ROLE_OWNER_MANAGER,
            ])
            ->groupBy('shop_conversation_id')
            ->pluck('latest_at', 'shop_conversation_id');

        $flags = [];
        foreach ($ids as $id) {
            $latest = $latestStaffMessage[$id] ?? null;
            if (! $latest) {
                $flags[$id] = false;
                continue;
            }

            $lastRead = $reads[$id] ?? null;
            if (! $lastRead) {
                $flags[$id] = true;
                continue;
            }

            $flags[$id] = Carbon::parse($latest)->gt(Carbon::parse($lastRead));
        }

        return $flags;
    }

    /**
     * Latest message per conversation, keyed by conversation id.
     *
     * @param  Collection<int, ShopConversation>  $conversations
     * @return Collection<int, ShopConversationMessage>
     */
    private function latestMessagesForConversations(Collection $conversations): Collection
    {
        $ids = $conversations->pluck('id')->all();
        if ($ids === []) {
            return collect();
        }

        $latestIds = ShopConversationMessage::query()
            ->select(DB::raw('MAX(id) as id'))
            ->whereIn('shop_conversation_id', $ids)
            ->groupBy('shop_conversation_id')
            ->pluck('id');

        if ($latestIds->isEmpty()) {
            return collect();
        }

        return ShopConversationMessage::query()
            ->with('sender.userDetail')
            ->whereIn('id', $latestIds)
            ->get()
            ->keyBy('shop_conversation_id');
    }

    /**
     * @return array{user_id: int, role: string, name: string}|null
     */
    private function formatLastSender(?ShopConversationMessage $message): ?array
    {
        if (! $message) {
            return null;
        }

        $message->loadMissing('sender.userDetail');

        return [
            'user_id' => (int) $message->sender_user_id,
            'role' => $message->sender_role,
            'name' => $this->displayName($message->sender),
        ];
    }

    /**
     * @return Collection<int, ShopConversation>
     */
    private function customerConversations(User $customer, bool $withShop = true): Collection
    {
        $query = ShopConversation::query()
            ->where('customer_user_id', $customer->id)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id');

        if ($withShop) {
            $query->with(['shop']);
        }

        return $query->get();
    }

    /**
     * @param  array<int, bool>  $flags
     */
    private function countUnreadFlags(array $flags): int
    {
        return collect($flags)->filter()->count();
    }

    private function senderRole(User $user): string
    {
        return match ($user->user_type) {
            User::TYPE_OWNER_MANAGER => ShopConversationMessage::ROLE_OWNER_MANAGER,
            User::TYPE_VENDOR => ShopConversationMessage::ROLE_VENDOR,
            default => ShopConversationMessage::ROLE_CUSTOMER,
        };
    }

    /**
     * @param  array<int, UploadedFile>  $files
     */
    private function resolveMessageType(array $files, string $body): string
    {
        $files = array_values(array_filter($files));
        if ($files === []) {
            return ShopConversationMessage::TYPE_TEXT;
        }

        $allImages = collect($files)->every(function (UploadedFile $file) {
            return str_starts_with((string) $file->getMimeType(), 'image/');
        });

        if ($allImages) {
            return ShopConversationMessage::TYPE_IMAGES;
        }

        return ShopConversationMessage::TYPE_FILE;
    }

    /**
     * @param  array<int, UploadedFile>  $files
     */
    private function storeAttachments(ShopConversationMessage $message, int $conversationId, array $files): void
    {
        foreach ($files as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $path = $file->store("shop-messages/{$conversationId}", 'public');

            ShopConversationAttachment::create([
                'shop_conversation_message_id' => $message->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_size' => $file->getSize() ?: 0,
                'mime_type' => $file->getClientMimeType(),
            ]);
        }
    }

    private function buildPreview(ShopConversationMessage $message, string $body): string
    {
        if ($body !== '') {
            return Str::limit($body, 180);
        }

        return match ($message->type) {
            ShopConversationMessage::TYPE_IMAGES => 'Sent a photo',
            ShopConversationMessage::TYPE_FILE => 'Sent a file',
            ShopConversationMessage::TYPE_PRODUCT => $this->productPreview($message),
            ShopConversationMessage::TYPE_ORDER_UPDATE => 'Order update',
            default => 'New message',
        };
    }

    private function productPreview(ShopConversationMessage $message): string
    {
        $name = trim((string) ($message->metadata['product_name'] ?? ''));
        $quantity = (int) ($message->metadata['quantity'] ?? 0);
        $lineTotal = $message->metadata['line_total'] ?? null;

        if ($name !== '' && $quantity > 0 && is_numeric($lineTotal)) {
            return Str::limit($name.' (qty '.$quantity.')', 180);
        }

        return $name !== '' ? Str::limit($name, 180) : 'Shared a product';
    }

    private function notifyCounterpart(
        ShopConversation $conversation,
        User $sender,
        ShopConversationMessage $message
    ): void {
        $conversation->loadMissing('shop', 'customer.userDetail');
        $preview = $conversation->fresh()->last_message_preview ?? 'New message';

        if ($message->isStaffMessage()) {
            $customerId = (int) $conversation->customer_user_id;
            if ($customerId === (int) $sender->id) {
                return;
            }

            Notification::createForUser(
                $customerId,
                'shop_message',
                $conversation->shop->shop_name ?? 'New message',
                $preview,
                'messages',
                $conversation,
                [
                    'shop_id' => $conversation->shop_id,
                    'conversation_id' => $conversation->id,
                ],
            );

            return;
        }

        // Customer → notify assigned vendors + owner/manager of the agrivet
        $shop = $conversation->shop;
        $recipientIds = $shop->vendors()->pluck('users.id')->all();

        $ownerManagerId = User::query()
            ->where('user_type', User::TYPE_OWNER_MANAGER)
            ->where('agrivet_id', $shop->agrivet_id)
            ->value('id');

        if ($ownerManagerId) {
            $recipientIds[] = (int) $ownerManagerId;
        }

        $customerName = $this->displayName($conversation->customer);
        $title = "Message from {$customerName}";

        foreach (array_unique($recipientIds) as $recipientId) {
            if ((int) $recipientId === (int) $sender->id) {
                continue;
            }

            Notification::createForUser(
                (int) $recipientId,
                'shop_message',
                $title,
                $preview,
                'messages',
                $conversation,
                [
                    'shop_id' => $conversation->shop_id,
                    'conversation_id' => $conversation->id,
                ],
            );
        }
    }

    private function displayName(?User $user): string
    {
        if (! $user) {
            return 'Customer';
        }

        $user->loadMissing('userDetail');
        $name = trim(($user->userDetail->first_name ?? '').' '.($user->userDetail->last_name ?? ''));

        if ($name !== '') {
            return $name;
        }

        return $user->userDetail->email ?? 'Customer';
    }

    private function avatarUrl(?User $user): ?string
    {
        if (! $user) {
            return null;
        }

        $user->loadMissing('userDetail');

        return $user->userDetail->profile_image_url
            ?: $user->userDetail->avatar
            ?: null;
    }

    private function listTimestamp($at): string
    {
        if (! $at) {
            return '';
        }

        $at = Carbon::parse($at);

        if ($at->isToday()) {
            return $at->format('g:i A');
        }

        if ($at->isYesterday()) {
            return 'Yesterday';
        }

        if ($at->greaterThan(now()->subWeek())) {
            return $at->format('D');
        }

        return $at->format('M j');
    }

    private function lastSeenLabel(ShopConversation $conversation): string
    {
        $lastCustomerMessage = $conversation->messages
            ->where('sender_role', ShopConversationMessage::ROLE_CUSTOMER)
            ->last();

        $at = $lastCustomerMessage?->created_at ?? $conversation->last_message_at;
        if (! $at) {
            return 'No activity yet';
        }

        if ($at->greaterThan(now()->subMinutes(15))) {
            return 'Active now';
        }

        return 'Last seen '.$at->diffForHumans();
    }

    private function dateSeparatorLabel(Carbon $at): string
    {
        if ($at->isToday()) {
            return 'Today';
        }

        if ($at->isYesterday()) {
            return 'Yesterday';
        }

        if ($at->isCurrentWeek()) {
            return $at->format('l');
        }

        return $at->format('F j, Y');
    }

    private function fileLabel(?string $mime): string
    {
        if (! $mime) {
            return 'Document File';
        }

        if (str_starts_with($mime, 'video/')) {
            return 'Video File';
        }

        if (str_starts_with($mime, 'image/')) {
            return 'Image File';
        }

        if ($mime === 'application/pdf') {
            return 'PDF Document';
        }

        return 'Document File';
    }

    private function humanFileSize(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / (1024 * 1024), 1).' MB';
    }
}

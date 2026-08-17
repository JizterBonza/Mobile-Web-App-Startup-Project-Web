<?php

namespace App\Http\Controllers;

use App\Models\Shop;
use App\Models\ShopConversation;
use App\Models\User;
use App\Services\ShopMessagingService;
use Illuminate\Http\Request;

class CustomerShopMessageController extends Controller
{
    public function __construct(
        private readonly ShopMessagingService $messaging
    ) {}

    /**
     * List conversations for the authenticated customer.
     */
    public function index(Request $request)
    {
        $user = $this->customerOrAbort($request);

        return response()->json($this->messaging->formatCustomerConversationList($user));
    }

    /**
     * Unread conversation count for the authenticated customer (badge polling).
     */
    public function unreadCount(Request $request)
    {
        $user = $this->customerOrAbort($request);

        return response()->json([
            'unread_count' => $this->messaging->unreadCountForCustomer($user),
        ]);
    }

    /**
     * Start or resume a conversation with a shop, optionally sending the first message.
     */
    public function start(Request $request, int $shopId)
    {
        $user = $this->customerOrAbort($request);
        $shop = Shop::findOrFail($shopId);

        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => [
                'file',
                'max:20480',
                'mimes:jpg,jpeg,png,gif,webp,mp4,pdf,docx',
            ],
        ]);

        $conversation = $this->messaging->findOrCreate($shop, $user);
        $body = trim((string) ($validated['body'] ?? ''));
        $files = array_values(array_filter($request->file('attachments', []) ?? []));

        if ($body !== '' || $files !== []) {
            $this->messaging->sendMessage($conversation, $user, $body, $files);
        }

        $thread = $this->messaging->formatConversationThread($conversation->fresh(), $user);

        return response()->json([
            'conversation' => $thread['conversation'],
            'messages' => $thread['messages'],
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ],
        ], 201);
    }

    /**
     * Show a conversation thread owned by the customer.
     */
    public function show(Request $request, int $conversationId)
    {
        $user = $this->customerOrAbort($request);
        $conversation = $this->ownedConversation($user, $conversationId);
        $thread = $this->messaging->formatConversationThread($conversation, $user);

        return response()->json([
            'conversation' => $thread['conversation'],
            'messages' => $thread['messages'],
            'shop' => [
                'id' => $conversation->shop_id,
                'shop_name' => $conversation->shop?->shop_name,
            ],
        ]);
    }

    /**
     * Send a message in an existing conversation.
     */
    public function send(Request $request, int $conversationId)
    {
        $user = $this->customerOrAbort($request);
        $conversation = $this->ownedConversation($user, $conversationId);

        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => [
                'file',
                'max:20480',
                'mimes:jpg,jpeg,png,gif,webp,mp4,pdf,docx',
            ],
        ]);

        $body = trim((string) ($validated['body'] ?? ''));
        $files = array_values(array_filter($request->file('attachments', []) ?? []));

        if ($body === '' && $files === []) {
            return response()->json(['message' => 'Message cannot be empty.'], 422);
        }

        $this->messaging->sendMessage($conversation, $user, $body, $files);
        $thread = $this->messaging->formatConversationThread($conversation->fresh(), $user);

        return response()->json([
            'conversation' => $thread['conversation'],
            'messages' => $thread['messages'],
        ]);
    }

    private function customerOrAbort(Request $request): User
    {
        $user = $request->user();
        if (! $user || $user->user_type !== User::TYPE_CUSTOMER) {
            abort(403, 'Only customers can use this endpoint.');
        }

        return $user;
    }

    private function ownedConversation(User $user, int $conversationId): ShopConversation
    {
        return ShopConversation::query()
            ->with('shop')
            ->where('customer_user_id', $user->id)
            ->where('id', $conversationId)
            ->firstOrFail();
    }
}

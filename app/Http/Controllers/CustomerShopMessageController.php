<?php

namespace App\Http\Controllers;

use App\Models\Farm;
use App\Models\FarmGamefowlListing;
use App\Models\Item;
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
     * Active shop listings for the mobile product picker.
     */
    public function products(Request $request, int $shopId)
    {
        $this->customerOrAbort($request);
        $shop = Shop::findOrFail($shopId);

        return response()->json([
            'products' => $this->messaging->listShopProductsForPicker(
                $shop,
                $request->string('search')->toString()
            ),
        ]);
    }

    /**
     * Start or resume a conversation with a shop, optionally sending the first message.
     */
    public function start(Request $request, int $shopId)
    {
        $user = $this->customerOrAbort($request);
        $shop = Shop::findOrFail($shopId);

        $validated = $request->validate($this->messageRules());

        $conversation = $this->messaging->findOrCreate($shop, $user);
        $body = trim((string) ($validated['body'] ?? ''));
        $files = array_values(array_filter($request->file('attachments', []) ?? []));
        $itemId = $validated['item_id'] ?? null;

        if ($itemId) {
            $item = $this->resolveActiveShopItem((int) $shop->id, (int) $itemId);
            $this->messaging->sendProductMessage($conversation, $user, $item, $body);
        } elseif ($body !== '' || $files !== []) {
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
     * Active farm listings for the mobile product picker.
     */
    public function farmProducts(Request $request, int $farmId)
    {
        $this->customerOrAbort($request);
        $farm = Farm::query()->where('status', 'active')->findOrFail($farmId);

        return response()->json([
            'products' => $this->messaging->listFarmListingsForPicker(
                $farm,
                $request->string('search')->toString()
            ),
        ]);
    }

    /**
     * Start or resume a conversation with a farm, optionally sending the first message.
     */
    public function startFarm(Request $request, int $farmId)
    {
        $user = $this->customerOrAbort($request);
        $farm = Farm::query()->where('status', 'active')->findOrFail($farmId);

        $validated = $request->validate($this->farmMessageRules());

        $conversation = $this->messaging->findOrCreateForFarm($farm, $user);
        $body = trim((string) ($validated['body'] ?? ''));
        $files = array_values(array_filter($request->file('attachments', []) ?? []));
        $listingId = $validated['item_id'] ?? null;

        if ($listingId) {
            $listing = $this->resolveActiveFarmListing($farm->id, (int) $listingId);
            $this->messaging->sendFarmListingMessage($conversation, $user, $listing, $body);
        } elseif ($body !== '' || $files !== []) {
            $this->messaging->sendMessage($conversation, $user, $body, $files);
        }

        $thread = $this->messaging->formatConversationThread($conversation->fresh(), $user);

        return response()->json([
            'conversation' => $thread['conversation'],
            'messages' => $thread['messages'],
            'farm' => [
                'id' => $farm->id,
                'name' => $farm->name,
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
            'shop' => $conversation->shop_id ? [
                'id' => $conversation->shop_id,
                'shop_name' => $conversation->shop?->shop_name,
            ] : null,
            'farm' => $conversation->farm_id ? [
                'id' => $conversation->farm_id,
                'name' => $conversation->farm?->name,
            ] : null,
        ]);
    }

    /**
     * Send a message in an existing conversation.
     */
    public function send(Request $request, int $conversationId)
    {
        $user = $this->customerOrAbort($request);
        $conversation = $this->ownedConversation($user, $conversationId);

        $rules = ($conversation->farm_id && ! $conversation->shop_id)
            ? $this->farmMessageRules()
            : $this->messageRules();
        $validated = $request->validate($rules);

        $body = trim((string) ($validated['body'] ?? ''));
        $files = array_values(array_filter($request->file('attachments', []) ?? []));
        $itemId = $validated['item_id'] ?? null;

        if ($itemId) {
            if ($conversation->farm_id && ! $conversation->shop_id) {
                $listing = $this->resolveActiveFarmListing((int) $conversation->farm_id, (int) $itemId);
                $this->messaging->sendFarmListingMessage($conversation, $user, $listing, $body);
            } else {
                $item = $this->resolveActiveShopItem((int) $conversation->shop_id, (int) $itemId);
                $this->messaging->sendProductMessage($conversation, $user, $item, $body);
            }
        } else {
            if ($body === '' && $files === []) {
                return response()->json(['message' => 'Message cannot be empty.'], 422);
            }

            $this->messaging->sendMessage($conversation, $user, $body, $files);
        }

        $thread = $this->messaging->formatConversationThread($conversation->fresh(), $user);

        return response()->json([
            'conversation' => $thread['conversation'],
            'messages' => $thread['messages'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function messageRules(): array
    {
        return [
            'body' => ['nullable', 'string', 'max:5000'],
            'item_id' => ['nullable', 'integer', 'exists:items,id'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => [
                'file',
                'max:20480',
                'mimes:jpg,jpeg,png,gif,webp,mp4,pdf,docx',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function farmMessageRules(): array
    {
        $rules = $this->messageRules();
        $rules['item_id'] = ['nullable', 'integer'];

        return $rules;
    }

    private function resolveActiveShopItem(int $shopId, int $itemId): Item
    {
        $item = Item::query()
            ->where('id', $itemId)
            ->where('shop_id', $shopId)
            ->where('item_status', 'active')
            ->first();

        if (! $item) {
            abort(422, 'Product not found in this shop.');
        }

        return $item;
    }

    private function resolveActiveFarmListing(int $farmId, int $listingId): FarmGamefowlListing
    {
        $listing = FarmGamefowlListing::query()
            ->where('id', $listingId)
            ->where('farm_id', $farmId)
            ->where('status', 'active')
            ->first();

        if (! $listing) {
            abort(422, 'Gamefowl not found on this farm.');
        }

        return $listing;
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
            ->with(['shop', 'farm'])
            ->where('customer_user_id', $user->id)
            ->where('id', $conversationId)
            ->firstOrFail();
    }
}

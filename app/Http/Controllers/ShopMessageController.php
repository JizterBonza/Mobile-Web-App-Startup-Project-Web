<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Shop;
use App\Models\User;
use App\Services\ShopMessagingService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShopMessageController extends Controller
{
    public function __construct(
        private readonly ShopMessagingService $messaging
    ) {}

    public function ownerManagerIndex()
    {
        $user = auth()->user();
        $agrivet = $user->managedAgrivet;
        $shops = $agrivet
            ? $agrivet->shops()->orderBy('shop_name')->get()
            : collect();

        return Inertia::render('Dashboard/OwnerManagerMessages', [
            'agrivet' => $agrivet,
            'branches' => $this->messaging->formatBranches($shops, $user),
        ]);
    }

    public function ownerManagerBranch(int $shopId)
    {
        $user = auth()->user();
        $agrivet = $user->managedAgrivet;
        if (! $agrivet) {
            return redirect()->route('dashboard.owner-manager.messages');
        }

        $shop = $this->messaging->assertOwnerManagerShopAccess($user, $shopId);

        return Inertia::render('Dashboard/OwnerManagerBranchChat', [
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ],
            'conversations' => $this->messaging->formatConversationList($shop, $user),
        ]);
    }

    public function ownerManagerConversation(int $shopId, int $conversationId)
    {
        $user = auth()->user();
        $agrivet = $user->managedAgrivet;
        if (! $agrivet) {
            return redirect()->route('dashboard.owner-manager.messages');
        }

        $shop = $this->messaging->assertOwnerManagerShopAccess($user, $shopId);
        $conversation = $this->messaging->findConversationForShop($shop, $conversationId);
        $thread = $this->messaging->formatConversationThread($conversation, $user);

        return Inertia::render('Dashboard/OwnerManagerConversation', [
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ],
            'conversation' => $thread['conversation'],
            'messages' => $thread['messages'],
            'sendUrl' => route('dashboard.owner-manager.messages.send', [
                'shopId' => $shop->id,
                'conversationId' => $conversation->id,
            ]),
            'productsUrl' => route('dashboard.owner-manager.messages.products', [
                'shopId' => $shop->id,
            ]),
        ]);
    }

    public function ownerManagerProducts(Request $request, int $shopId)
    {
        $user = auth()->user();
        $shop = $this->messaging->assertOwnerManagerShopAccess($user, $shopId);

        return response()->json([
            'products' => $this->messaging->listShopProductsForPicker(
                $shop,
                $request->string('search')->toString()
            ),
        ]);
    }

    public function ownerManagerSend(Request $request, int $shopId, int $conversationId)
    {
        $user = auth()->user();
        $shop = $this->messaging->assertOwnerManagerShopAccess($user, $shopId);
        $conversation = $this->messaging->findConversationForShop($shop, $conversationId);

        return $this->storeMessage($request, $conversation, $user);
    }

    public function vendorIndex()
    {
        $user = auth()->user();
        $shop = $this->resolveVendorShop($user);

        if (! $shop) {
            return Inertia::render('Dashboard/VendorMessages', [
                'shop' => null,
                'conversations' => [],
            ]);
        }

        return Inertia::render('Dashboard/VendorMessages', [
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ],
            'conversations' => $this->messaging->formatConversationList($shop, $user),
        ]);
    }

    public function vendorConversation(int $conversationId)
    {
        $user = auth()->user();
        $shop = $this->resolveVendorShop($user);

        if (! $shop) {
            return redirect()->route('dashboard.vendor.messages')
                ->withErrors(['error' => 'You are not associated with any shop.']);
        }

        $this->messaging->assertVendorShopAccess($user, $shop);
        $conversation = $this->messaging->findConversationForShop($shop, $conversationId);
        $thread = $this->messaging->formatConversationThread($conversation, $user);

        return Inertia::render('Dashboard/VendorConversation', [
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ],
            'conversation' => $thread['conversation'],
            'messages' => $thread['messages'],
            'sendUrl' => route('dashboard.vendor.messages.send', [
                'conversationId' => $conversation->id,
            ]),
            'productsUrl' => route('dashboard.vendor.messages.products'),
        ]);
    }

    public function vendorProducts(Request $request)
    {
        $user = auth()->user();
        $shop = $this->resolveVendorShop($user);

        if (! $shop) {
            return response()->json(['products' => []]);
        }

        $this->messaging->assertVendorShopAccess($user, $shop);

        return response()->json([
            'products' => $this->messaging->listShopProductsForPicker(
                $shop,
                $request->string('search')->toString()
            ),
        ]);
    }

    public function vendorSend(Request $request, int $conversationId)
    {
        $user = auth()->user();
        $shop = $this->resolveVendorShop($user);

        if (! $shop) {
            return redirect()->back()->withErrors(['error' => 'You are not associated with any shop.']);
        }

        $this->messaging->assertVendorShopAccess($user, $shop);
        $conversation = $this->messaging->findConversationForShop($shop, $conversationId);

        return $this->storeMessage($request, $conversation, $user);
    }

    private function storeMessage(Request $request, $conversation, User $user)
    {
        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'item_id' => ['nullable', 'integer', 'exists:items,id'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => [
                'file',
                'max:20480',
                'mimes:jpg,jpeg,png,gif,webp,mp4,pdf,docx',
            ],
        ]);

        $files = array_values(array_filter($request->file('attachments', []) ?? []));
        $body = trim((string) ($validated['body'] ?? ''));
        $itemId = $validated['item_id'] ?? null;

        if ($itemId) {
            $item = Item::query()
                ->where('id', $itemId)
                ->where('shop_id', $conversation->shop_id)
                ->where('item_status', 'active')
                ->first();

            if (! $item) {
                return redirect()->back()->withErrors(['item_id' => 'Product not found in this shop.']);
            }

            $this->messaging->sendProductMessage($conversation, $user, $item, $body);

            return redirect()->back()->with('success', 'Message sent.');
        }

        if ($body === '' && $files === []) {
            return redirect()->back()->withErrors(['body' => 'Message cannot be empty.']);
        }

        $this->messaging->sendMessage($conversation, $user, $body, $files);

        return redirect()->back()->with('success', 'Message sent.');
    }

    private function resolveVendorShop(User $user): ?Shop
    {
        $user->loadMissing('shops');

        return $user->shops->first();
    }
}

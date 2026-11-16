<?php

namespace App\Http\Middleware;

use App\Models\Notification;
use App\Models\User;
use App\Services\ShopMessagingService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        if ($user) {
            $user->load('userDetail');
        }

        $authUser = null;
        if ($user) {
            $authUser = [
                'id' => $user->id,
                'name' => ($user->userDetail ? $user->userDetail->first_name . ' ' . $user->userDetail->last_name : 'User'),
                'email' => $user->userDetail->email ?? '',
                'user_type' => $user->user_type,
            ];

            if ($user->user_type === User::TYPE_OWNER_MANAGER && $user->farm_id) {
                $authUser['farm_name'] = $user->managedFarm?->name;
                $authUser['manages_farm'] = ! $user->agrivet_id;
            }
        }

        return [
            ...parent::share($request),
            'csrf_token' => csrf_token(),
            'auth' => [
                'user' => $authUser,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'message' => $request->session()->get('message'),
            ],
            'messaging' => function () use ($user) {
                if (! $user || ! in_array($user->user_type, [User::TYPE_VENDOR, User::TYPE_OWNER_MANAGER], true)) {
                    return ['unread_count' => 0];
                }

                return [
                    'unread_count' => app(ShopMessagingService::class)->unreadCountForDashboard($user),
                ];
            },
            'headerNotifications' => function () use ($user) {
                if (! $user || ! in_array($user->user_type, [User::TYPE_SUPER_ADMIN, User::TYPE_ADMIN], true)) {
                    return null;
                }

                $unread = Notification::query()
                    ->where('user_id', $user->id)
                    ->where('read', false);

                return [
                    'unread_count' => (clone $unread)->count(),
                    'items' => (clone $unread)
                        ->latest()
                        ->limit(8)
                        ->get(['id', 'title', 'message', 'action_url', 'created_at'])
                        ->map(fn (Notification $notification) => [
                            'id' => $notification->id,
                            'title' => $notification->title,
                            'message' => $notification->message,
                            'action_url' => $notification->action_url,
                            'created_at' => $notification->created_at?->toIso8601String(),
                        ])
                        ->values()
                        ->all(),
                ];
            },
        ];
    }
}

<?php

namespace App\Http\Middleware;

use App\Models\User;
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
        ];
    }
}

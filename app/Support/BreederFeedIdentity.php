<?php

namespace App\Support;

use App\Models\User;

class BreederFeedIdentity
{
    public static function author(User $user): array
    {
        $detail = $user->userDetail;
        $name = trim(implode(' ', array_filter([
            $detail?->first_name, $detail?->middle_name, $detail?->last_name,
        ])));

        return [
            'id' => $user->id,
            'name' => $name !== '' ? $name : 'User',
            'avatar_url' => self::url($detail?->profile_image_url ?: $detail?->avatar),
            'user_type' => $user->user_type,
        ];
    }

    public static function url(?string $path): ?string
    {
        $url = PublicStorage::url($path);

        return $url === null ? null : url($url);
    }
}

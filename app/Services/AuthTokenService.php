<?php

namespace App\Services;

use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Support\Str;

class AuthTokenService
{
    public function accessTokenTtlMinutes(): int
    {
        return (int) config('sanctum.access_token_expiration', 60);
    }

    public function refreshTokenTtlMinutes(): int
    {
        return (int) config('sanctum.refresh_token_expiration', 43200);
    }

    /**
     * Issue a short-lived access token and a long-lived refresh token.
     *
     * @return array{token: string, refresh_token: string, expires_at: \Illuminate\Support\Carbon|null}
     */
    public function createTokenPair(User $user, string $accessTokenName = 'mobile-token'): array
    {
        $accessToken = $user->createToken(
            $accessTokenName,
            ['*'],
            now()->addMinutes($this->accessTokenTtlMinutes())
        );

        $plainRefreshToken = Str::random(64);

        RefreshToken::create([
            'user_id' => $user->id,
            'personal_access_token_id' => $accessToken->accessToken->id,
            'token' => hash('sha256', $plainRefreshToken),
            'expires_at' => now()->addMinutes($this->refreshTokenTtlMinutes()),
        ]);

        return [
            'token' => $accessToken->plainTextToken,
            'refresh_token' => $plainRefreshToken,
            'expires_at' => $accessToken->accessToken->expires_at,
        ];
    }

    /**
     * Exchange a valid refresh token for a new access/refresh token pair.
     *
     * @return array{token: string, refresh_token: string, expires_at: \Illuminate\Support\Carbon|null}|null
     */
    public function refresh(string $plainRefreshToken): ?array
    {
        $refreshToken = RefreshToken::where('token', hash('sha256', $plainRefreshToken))
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();

        if (! $refreshToken) {
            return null;
        }

        $user = $refreshToken->user;

        if ($refreshToken->personalAccessToken) {
            $refreshToken->personalAccessToken->delete();
        }

        $refreshToken->update(['revoked_at' => now()]);

        return $this->createTokenPair($user, 'mobile-login-token');
    }

    public function revokeByAccessTokenId(int $personalAccessTokenId): void
    {
        RefreshToken::where('personal_access_token_id', $personalAccessTokenId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }
}

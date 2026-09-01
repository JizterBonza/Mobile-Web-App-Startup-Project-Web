<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use InvalidArgumentException;

class GoogleIdentityService
{
    /**
     * @return array{sub: string, email: string, name: ?string, picture: ?string, email_verified: bool}
     */
    public function userFromAccessToken(string $accessToken): array
    {
        $tokenInfo = $this->http()->get('https://oauth2.googleapis.com/tokeninfo', [
            'access_token' => $accessToken,
        ]);

        if (! $tokenInfo->successful()) {
            throw new InvalidArgumentException('Invalid or expired Google access token.');
        }

        $this->assertAudience($tokenInfo->json() ?? []);

        $userInfo = $this->http()
            ->withToken($accessToken)
            ->get('https://www.googleapis.com/oauth2/v3/userinfo');

        if (! $userInfo->successful()) {
            throw new InvalidArgumentException('Unable to load Google account details.');
        }

        return $this->normalizeUserPayload($userInfo->json() ?? [], $tokenInfo->json() ?? []);
    }

    /**
     * @return array{sub: string, email: string, name: ?string, picture: ?string, email_verified: bool}
     */
    public function userFromIdToken(string $idToken): array
    {
        $response = $this->http()->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->successful()) {
            throw new InvalidArgumentException('Invalid or expired Google ID token.');
        }

        $payload = $response->json() ?? [];
        $this->assertAudience($payload);

        return $this->normalizeUserPayload($payload, $payload);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function assertAudience(array $payload): void
    {
        $clientIds = $this->allowedClientIds();

        if ($clientIds === []) {
            throw new InvalidArgumentException('Google OAuth is not configured on the server.');
        }

        $audience = $payload['aud'] ?? '';
        $authorizedParty = $payload['azp'] ?? '';

        if (! in_array($audience, $clientIds, true) && ! in_array($authorizedParty, $clientIds, true)) {
            throw new InvalidArgumentException('Google token audience is not allowed.');
        }
    }

    /**
     * @param  array<string, mixed>  $primary
     * @param  array<string, mixed>  $fallback
     * @return array{sub: string, email: string, name: ?string, picture: ?string, email_verified: bool}
     */
    protected function normalizeUserPayload(array $primary, array $fallback): array
    {
        $sub = $primary['sub'] ?? $fallback['sub'] ?? null;
        $email = $primary['email'] ?? $fallback['email'] ?? null;

        if (empty($sub) || empty($email)) {
            throw new InvalidArgumentException('Google account did not provide an email address.');
        }

        return [
            'sub' => (string) $sub,
            'email' => (string) $email,
            'name' => $primary['name'] ?? $fallback['name'] ?? null,
            'picture' => $primary['picture'] ?? $fallback['picture'] ?? null,
            'email_verified' => filter_var(
                $primary['email_verified'] ?? $fallback['email_verified'] ?? false,
                FILTER_VALIDATE_BOOLEAN
            ),
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function allowedClientIds(): array
    {
        return array_values(array_filter([
            config('services.google.client_id'),
            config('services.google.android_client_id'),
            config('services.google.ios_client_id'),
        ]));
    }

    protected function http()
    {
        $pending = Http::timeout(10);

        if (app()->environment('local')) {
            $pending = $pending->withoutVerifying();
        }

        return $pending;
    }
}

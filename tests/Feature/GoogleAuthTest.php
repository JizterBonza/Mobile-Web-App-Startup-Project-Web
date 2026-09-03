<?php

namespace Tests\Feature;

use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }

    public function test_google_redirect_sends_the_user_to_google(): void
    {
        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.client_secret' => 'test-client-secret',
            'services.google.web_redirect' => 'http://localhost/auth/google/callback',
        ]);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('redirectUrl')->once()->andReturnSelf();
        $provider->shouldReceive('redirect')->once()->andReturn(
            new RedirectResponse('https://accounts.google.com/o/oauth2/auth')
        );

        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $this->get('/auth/google')->assertRedirect('https://accounts.google.com/o/oauth2/auth');
    }

    public function test_google_callback_rejects_unknown_accounts(): void
    {
        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.client_secret' => 'test-client-secret',
            'services.google.web_redirect' => 'http://localhost/auth/google/callback',
        ]);

        $this->mockGoogleUser('nobody-google-auth-test@example.com');

        $this->get('/auth/google/callback?code=fake')
            ->assertRedirect('/login')
            ->assertSessionHas('error');
    }

    public function test_google_token_rejects_unknown_accounts(): void
    {
        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.client_secret' => 'test-client-secret',
        ]);

        Http::fake([
            'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'test-client-id',
                'azp' => 'test-client-id',
                'sub' => 'google-id-123',
                'email' => 'nobody-google-auth-test@example.com',
                'email_verified' => 'true',
            ]),
            'https://www.googleapis.com/oauth2/v3/userinfo' => Http::response([
                'sub' => 'google-id-123',
                'email' => 'nobody-google-auth-test@example.com',
                'name' => 'Google User',
                'picture' => null,
                'email_verified' => true,
            ]),
        ]);

        $this->post('/auth/google/token', ['access_token' => 'fake-access-token'])
            ->assertRedirect('/login')
            ->assertSessionHas('error');
    }

    protected function mockGoogleUser(string $email): void
    {
        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getEmail')->andReturn($email);
        $socialiteUser->shouldReceive('getName')->andReturn('Google User');
        $socialiteUser->shouldReceive('getAvatar')->andReturn(null);
        $socialiteUser->shouldReceive('getId')->andReturn('google-id-123');

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('redirectUrl')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }
}

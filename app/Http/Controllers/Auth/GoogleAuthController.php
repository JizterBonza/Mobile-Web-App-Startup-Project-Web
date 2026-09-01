<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDetail;
use App\Services\GoogleIdentityService;
use GuzzleHttp\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Throwable;

class GoogleAuthController extends Controller
{
    use EstablishesWebAuthSession;

    private const WEB_DASHBOARD_TYPES = [
        User::TYPE_SUPER_ADMIN,
        User::TYPE_ADMIN,
        User::TYPE_VENDOR,
        User::TYPE_OWNER_MANAGER,
        User::TYPE_VETERINARIAN,
    ];

    /**
     * Send the user to Google's OAuth consent screen.
     */
    public function redirect(Request $request): RedirectResponse
    {
        if (Auth::check()) {
            /** @var User $user */
            $user = Auth::user();

            return redirect($user->getDashboardUrl());
        }

        if (! $this->isGoogleConfigured()) {
            return redirect()->route('login')->with('error', 'Google sign-in is not configured.');
        }

        try {
            return $this->googleDriver($request)->redirect();
        } catch (Throwable $e) {
            report($e);

            return redirect()->route('login')->with('error', 'Unable to start Google sign-in. Please try again.');
        }
    }

    /**
     * Handle the OAuth callback from Google and start a web session.
     */
    public function callback(Request $request): RedirectResponse
    {
        if (Auth::check()) {
            /** @var User $user */
            $user = Auth::user();

            return redirect($user->getDashboardUrl());
        }

        if ($request->query('error')) {
            return redirect()->route('login')->with('error', 'Google sign-in was cancelled.');
        }

        if (! $this->isGoogleConfigured()) {
            return redirect()->route('login')->with('error', 'Google sign-in is not configured.');
        }

        try {
            $googleUser = $this->googleDriver($request)->user();
        } catch (InvalidStateException $e) {
            return redirect()->route('login')->with('error', 'Google sign-in expired. Please try again.');
        } catch (Throwable $e) {
            report($e);

            return redirect()->route('login')->with('error', 'Failed to authenticate with Google. Please try again.');
        }

        return $this->loginFromGoogleProfile(
            $request,
            $googleUser->getEmail(),
            $googleUser->getAvatar(),
            $googleUser->getId()
        );
    }

    /**
     * Complete Google sign-in from a popup access token or ID token.
     */
    public function token(Request $request, GoogleIdentityService $googleIdentity): RedirectResponse
    {
        if (Auth::check()) {
            /** @var User $user */
            $user = Auth::user();

            return redirect($user->getDashboardUrl());
        }

        $data = $request->validate([
            'access_token' => 'nullable|string',
            'id_token' => 'nullable|string',
        ]);

        if (empty($data['access_token']) && empty($data['id_token'])) {
            return redirect()->route('login')->with('error', 'Google sign-in did not return a token. Please try again.');
        }

        if (! $this->isGoogleConfigured()) {
            return redirect()->route('login')->with('error', 'Google sign-in is not configured.');
        }

        try {
            $payload = ! empty($data['access_token'])
                ? $googleIdentity->userFromAccessToken($data['access_token'])
                : $googleIdentity->userFromIdToken($data['id_token']);
        } catch (InvalidArgumentException $e) {
            return redirect()->route('login')->with('error', $e->getMessage());
        } catch (Throwable $e) {
            report($e);

            return redirect()->route('login')->with('error', 'Failed to authenticate with Google. Please try again.');
        }

        return $this->loginFromGoogleProfile(
            $request,
            $payload['email'],
            $payload['picture'],
            $payload['sub']
        );
    }

    protected function loginFromGoogleProfile(
        Request $request,
        ?string $email,
        ?string $avatar,
        ?string $providerId
    ): RedirectResponse {
        if (! $email) {
            return redirect()->route('login')->with('error', 'Google did not provide an email address for this account.');
        }

        $userDetail = UserDetail::query()
            ->whereRaw('LOWER(email) = ?', [strtolower($email)])
            ->first();

        if (! $userDetail) {
            return redirect()->route('login')->with(
                'error',
                'No Klasmeyt account is linked to this Google email. Sign in with your email and password, or contact support.'
            );
        }

        $user = User::query()->where('user_detail_id', $userDetail->id)->first();

        if (! $user) {
            return redirect()->route('login')->with('error', 'Your account is not properly configured. Please contact support.');
        }

        $accessError = $this->webDashboardAccessError($user);

        if ($accessError) {
            return redirect()->route('login')->with('error', $accessError);
        }

        $userDetail->update([
            'profile_image_url' => $avatar ?: $userDetail->profile_image_url,
            'avatar' => $avatar ?: $userDetail->avatar,
            'email_confirmed' => true,
            'provider' => 'google',
            'provider_id' => $providerId,
        ]);

        return $this->establishWebAuthSession($request, $user, true);
    }

    protected function googleDriver(Request $request)
    {
        /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
        $driver = Socialite::driver('google');
        $driver->redirectUrl($this->callbackUrl($request));

        if (app()->environment('local')) {
            $driver->setHttpClient(new Client(['verify' => false]));
        }

        return $driver;
    }

    protected function callbackUrl(Request $request): string
    {
        if (app()->environment('local')) {
            return $request->getSchemeAndHttpHost().'/auth/google/callback';
        }

        return config('services.google.web_redirect')
            ?: rtrim((string) config('app.url'), '/').'/auth/google/callback';
    }

    protected function isGoogleConfigured(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'));
    }

    protected function webDashboardAccessError(User $user): ?string
    {
        if (! $user->user_type) {
            return 'Your account is not properly configured. Please contact support.';
        }

        if (! in_array($user->user_type, self::WEB_DASHBOARD_TYPES, true)) {
            return 'This account cannot sign in to the web dashboard. Please use the Klasmeyt mobile app.';
        }

        if ($user->user_type === User::TYPE_VENDOR) {
            $user->load('agrivets');

            if ($user->agrivets->isEmpty()) {
                return 'You are not associated with any Agrivet. Please contact an administrator to be assigned to an Agrivet.';
            }
        }

        if ($user->user_type === User::TYPE_OWNER_MANAGER && ! $user->agrivet_id) {
            return 'Your owner/manager account is not linked to an Agrivet. Please contact support.';
        }

        return null;
    }
}

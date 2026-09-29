<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Providers\RouteServiceProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class SocialAuthController extends Controller
{
    /**
     * List of supported OAuth providers.
     *
     * @var array<string>
     */
    protected array $supportedProviders = ['google', 'github'];

    /**
     * Redirect the user to the OAuth provider authentication page.
     */
    public function redirect(string $provider): Response
    {
        if (!in_array($provider, $this->supportedProviders, true)) {
            abort(404, 'Provider not supported.');
        }

        return Socialite::driver($provider)->redirect();
    }

    /**
     * Obtain the user information from the OAuth provider.
     */
    public function callback(Request $request, string $provider): RedirectResponse
    {
        if (!in_array($provider, $this->supportedProviders, true)) {
            abort(404, 'Provider not supported.');
        }

        try {
            $socialUser = Socialite::driver($provider)->user();
        } catch (\Throwable $e) {
            Log::error("Social login failed for provider [{$provider}]: " . $e->getMessage());

            return redirect()->route('login')->with('status', 'Failed to authenticate with ' . ucfirst($provider) . '. Please try again.');
        }

        $socialId = $socialUser->getId();
        $socialEmail = $socialUser->getEmail();
        $providerIdColumn = $provider . '_id';

        if (!$socialEmail && !$socialId) {
            return redirect()->route('login')->with('status', 'Unable to retrieve user information from ' . ucfirst($provider) . '.');
        }

        // 1. Check if a user exists with this provider's ID
        $user = User::where($providerIdColumn, $socialId)->first();

        // 2. If not found by provider ID, check by email and link account
        if (!$user && $socialEmail) {
            $user = User::where('email', $socialEmail)->first();

            if ($user) {
                $user->update([
                    $providerIdColumn => $socialId,
                    'avatar' => $user->avatar ?: $socialUser->getAvatar(),
                    'email_verified_at' => $user->email_verified_at ?: now(),
                ]);
            }
        }

        // 3. If user still doesn't exist, create a new user
        if (!$user) {
            $userName = $socialUser->getName() ?: $socialUser->getNickname() ?: 'User';

            $user = User::create([
                'name' => $userName,
                'email' => $socialEmail,
                $providerIdColumn => $socialId,
                'avatar' => $socialUser->getAvatar(),
                'email_verified_at' => now(),
            ]);
        }

        Auth::login($user, true);

        $request->session()->regenerate();

        return redirect()->intended(RouteServiceProvider::HOME);
    }
}

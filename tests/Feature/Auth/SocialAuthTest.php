<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Providers\RouteServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\User as SocialiteUserContract;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\AbstractProvider;
use Mockery;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_user_can_be_redirected_to_google(): void
    {
        $response = $this->get(route('social.redirect', 'google'));

        $response->assertStatus(302);
        $this->assertStringContainsString('accounts.google.com', $response->headers->get('Location'));
    }

    public function test_user_can_be_redirected_to_github(): void
    {
        $response = $this->get(route('social.redirect', 'github'));

        $response->assertStatus(302);
        $this->assertStringContainsString('github.com/login/oauth', $response->headers->get('Location'));
    }

    public function test_unsupported_provider_returns_404(): void
    {
        $response = $this->get('/auth/unsupported_provider');

        $response->assertStatus(404);
    }

    public function test_new_user_can_authenticate_via_google_callback(): void
    {
        $abstractUser = Mockery::mock(SocialiteUserContract::class);
        $abstractUser->shouldReceive('getId')->andReturn('google-123456');
        $abstractUser->shouldReceive('getName')->andReturn('Google User');
        $abstractUser->shouldReceive('getNickname')->andReturn(null);
        $abstractUser->shouldReceive('getEmail')->andReturn('googleuser@example.com');
        $abstractUser->shouldReceive('getAvatar')->andReturn('https://lh3.googleusercontent.com/a/avatar.png');

        $provider = Mockery::mock(AbstractProvider::class);
        $provider->shouldReceive('user')->andReturn($abstractUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get(route('social.callback', 'google'));

        $response->assertRedirect(RouteServiceProvider::HOME);
        $this->assertAuthenticated();

        $this->assertDatabaseHas('users', [
            'name' => 'Google User',
            'email' => 'googleuser@example.com',
            'google_id' => 'google-123456',
            'avatar' => 'https://lh3.googleusercontent.com/a/avatar.png',
        ]);
    }

    public function test_new_user_can_authenticate_via_github_callback(): void
    {
        $abstractUser = Mockery::mock(SocialiteUserContract::class);
        $abstractUser->shouldReceive('getId')->andReturn('github-987654');
        $abstractUser->shouldReceive('getName')->andReturn('GitHub Developer');
        $abstractUser->shouldReceive('getNickname')->andReturn('ghdev');
        $abstractUser->shouldReceive('getEmail')->andReturn('githubdev@example.com');
        $abstractUser->shouldReceive('getAvatar')->andReturn('https://avatars.githubusercontent.com/u/987654');

        $provider = Mockery::mock(AbstractProvider::class);
        $provider->shouldReceive('user')->andReturn($abstractUser);

        Socialite::shouldReceive('driver')->with('github')->andReturn($provider);

        $response = $this->get(route('social.callback', 'github'));

        $response->assertRedirect(RouteServiceProvider::HOME);
        $this->assertAuthenticated();

        $this->assertDatabaseHas('users', [
            'name' => 'GitHub Developer',
            'email' => 'githubdev@example.com',
            'github_id' => 'github-987654',
            'avatar' => 'https://avatars.githubusercontent.com/u/987654',
        ]);
    }

    public function test_existing_user_with_same_email_is_linked_on_oauth_login(): void
    {
        $existingUser = User::factory()->create([
            'email' => 'existinguser@example.com',
            'google_id' => null,
        ]);

        $abstractUser = Mockery::mock(SocialiteUserContract::class);
        $abstractUser->shouldReceive('getId')->andReturn('google-888999');
        $abstractUser->shouldReceive('getName')->andReturn('Existing User Google');
        $abstractUser->shouldReceive('getNickname')->andReturn(null);
        $abstractUser->shouldReceive('getEmail')->andReturn('existinguser@example.com');
        $abstractUser->shouldReceive('getAvatar')->andReturn('https://google.com/avatar.jpg');

        $provider = Mockery::mock(AbstractProvider::class);
        $provider->shouldReceive('user')->andReturn($abstractUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get(route('social.callback', 'google'));

        $response->assertRedirect(RouteServiceProvider::HOME);
        $this->assertAuthenticatedAs($existingUser);

        $this->assertDatabaseHas('users', [
            'id' => $existingUser->id,
            'email' => 'existinguser@example.com',
            'google_id' => 'google-888999',
        ]);
    }

    public function test_oauth_failure_redirects_to_login_with_status_message(): void
    {
        $provider = Mockery::mock(AbstractProvider::class);
        $provider->shouldReceive('user')->andThrow(new \Exception('OAuth error: access denied'));

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get(route('social.callback', 'google'));

        $response->assertRedirect(route('login'));
        $response->assertSessionHas('status');
        $this->assertGuest();
    }
}

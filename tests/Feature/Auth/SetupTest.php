<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Providers\RouteServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_setup_screen_can_be_rendered_when_no_users_exist(): void
    {
        $this->assertEquals(0, User::count());

        $response = $this->get('/setup');

        $response->assertStatus(200);
    }

    public function test_first_user_can_be_created_with_admin_role_and_authenticated(): void
    {
        $this->assertEquals(0, User::count());

        $response = $this->post('/setup', [
            'name' => 'First Admin',
            'email' => 'admin@example.com',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $this->assertAuthenticated();

        $user = User::first();
        $this->assertNotNull($user);
        $this->assertEquals('First Admin', $user->name);
        $this->assertEquals('admin@example.com', $user->email);
        $this->assertEquals('admin', $user->role);
        $this->assertTrue($user->isAdmin());

        $response->assertRedirect(route('dashboard'));
    }

    public function test_setup_screen_redirects_to_login_when_user_already_exists(): void
    {
        User::factory()->create([
            'role' => 'admin',
        ]);

        $this->assertEquals(1, User::count());

        $response = $this->get('/setup');

        $response->assertRedirect(route('login'));
    }

    public function test_post_setup_is_rejected_when_user_already_exists(): void
    {
        User::factory()->create([
            'role' => 'admin',
        ]);

        $response = $this->post('/setup', [
            'name' => 'Second User',
            'email' => 'second@example.com',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $response->assertRedirect(route('login'));
        $this->assertEquals(1, User::count());
        $this->assertDatabaseMissing('users', [
            'email' => 'second@example.com',
        ]);
    }

    public function test_setup_requires_valid_data(): void
    {
        $response = $this->post('/setup', [
            'name' => '',
            'email' => 'invalid-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ]);

        $response->assertSessionHasErrors(['name', 'email', 'password']);
        $this->assertEquals(0, User::count());
        $this->assertGuest();
    }
}

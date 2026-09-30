<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\CashFlow\Models\TelegramAuthorizedUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;
    protected User $seller;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\App\Modules\CashFlow\database\seeders\CashFlowSeeder::class);

        $this->manager = User::factory()->create([
            'role' => 'manager',
            'name' => 'Test Manager',
        ]);
        $this->seller = User::factory()->create([
            'role' => 'seller',
            'name' => 'Test Seller',
        ]);
    }

    public function test_manager_can_view_user_management_index(): void
    {
        $response = $this->actingAs($this->manager)
            ->get(route('admin.cashflow.users.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Modules/CashFlow/Users/Index')
            ->has('users.data')
            ->has('stats')
        );
    }

    public function test_seller_cannot_view_user_management_index(): void
    {
        $response = $this->actingAs($this->seller)
            ->get(route('admin.cashflow.users.index'));

        $response->assertStatus(403);
    }

    public function test_manager_can_create_user_with_telegram_id(): void
    {
        $response = $this->actingAs($this->manager)
            ->post(route('admin.cashflow.users.store'), [
                'name' => 'Nguyen Van A',
                'email' => 'nguyenvana@test.local',
                'role' => 'seller',
                'telegram_user_id' => 12345678,
                'password' => 'secret123',
            ]);

        $response->assertRedirect(route('admin.cashflow.users.index'));
        $this->assertDatabaseHas('users', [
            'email' => 'nguyenvana@test.local',
            'role' => 'seller',
            'telegram_user_id' => 12345678,
        ]);

        $this->assertDatabaseHas('telegram_authorized_users', [
            'telegram_user_id' => 12345678,
            'role' => 'seller',
            'is_active' => true,
        ]);
    }

    public function test_manager_can_update_user_and_sync_telegram_id(): void
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'old@test.local',
            'role' => 'seller',
            'telegram_user_id' => 11111111,
        ]);

        TelegramAuthorizedUser::create([
            'telegram_user_id' => 11111111,
            'full_name' => 'Old Name',
            'role' => 'seller',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->manager)
            ->put(route('admin.cashflow.users.update', $user->id), [
                'name' => 'Updated Name',
                'email' => 'updated@test.local',
                'role' => 'manager',
                'telegram_user_id' => 22222222,
            ]);

        $response->assertRedirect(route('admin.cashflow.users.index'));
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'email' => 'updated@test.local',
            'role' => 'manager',
            'telegram_user_id' => 22222222,
        ]);

        // Old telegram id removed, new one registered
        $this->assertDatabaseMissing('telegram_authorized_users', ['telegram_user_id' => 11111111]);
        $this->assertDatabaseHas('telegram_authorized_users', [
            'telegram_user_id' => 22222222,
            'full_name' => 'Updated Name',
            'role' => 'manager',
            'is_active' => true,
        ]);
    }

    public function test_user_cannot_delete_themselves(): void
    {
        $response = $this->actingAs($this->manager)
            ->delete(route('admin.cashflow.users.destroy', $this->manager->id));

        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $this->manager->id]);
    }

    public function test_manager_can_delete_other_user(): void
    {
        $target = User::factory()->create([
            'name' => 'To Delete',
            'email' => 'todelete@test.local',
            'role' => 'seller',
            'telegram_user_id' => 33333333,
        ]);

        TelegramAuthorizedUser::create([
            'telegram_user_id' => 33333333,
            'full_name' => 'To Delete',
            'role' => 'seller',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->manager)
            ->delete(route('admin.cashflow.users.destroy', $target->id));

        $response->assertRedirect(route('admin.cashflow.users.index'));
        $this->assertDatabaseMissing('users', ['id' => $target->id]);
        $this->assertDatabaseMissing('telegram_authorized_users', ['telegram_user_id' => 33333333]);
    }
}

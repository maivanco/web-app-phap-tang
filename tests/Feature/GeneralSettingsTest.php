<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\GeneralSettings\Models\Setting;
use App\Modules\GeneralSettings\Services\BrevoService;
use App\Modules\GeneralSettings\Services\SettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeneralSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $sellerUser;
    protected SettingService $settingService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
        ]);

        $this->sellerUser = User::factory()->create([
            'role' => 'seller',
        ]);

        $this->settingService = app(SettingService::class);
    }

    public function test_guest_cannot_access_settings(): void
    {
        $response = $this->get(route('admin.general_settings.email'));
        $response->assertRedirect(route('login'));
    }

    public function test_seller_cannot_access_settings(): void
    {
        $response = $this->actingAs($this->sellerUser)
            ->get(route('admin.general_settings.email'));

        $response->assertForbidden();
    }

    public function test_admin_can_access_general_settings_index_and_gets_redirected_to_email_settings(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->get(route('admin.general_settings.index'));

        $response->assertRedirect(route('admin.general_settings.email'));
    }

    public function test_admin_can_view_email_settings_page(): void
    {
        $this->settingService->set('brevo_api_key', 'test-key-123', 'email');
        $this->settingService->set('mail_from_name', 'Pháp Tạng Test', 'email');
        $this->settingService->set('mail_from_address', 'test@phaptang.com', 'email');

        Http::fake([
            'https://api.brevo.com/v3/account' => Http::response([
                'email' => 'admin@brevo.test',
                'companyName' => 'Pháp Tạng Org',
                'firstName' => 'Văn',
                'lastName' => 'Mai',
                'plan' => [
                    [
                        'type' => 'free',
                        'credits' => 300,
                    ],
                ],
            ], 200),
            'https://api.brevo.com/v3/smtp/statistics/reports*' => Http::response([
                'reports' => [
                    [
                        'date' => now()->format('Y-m-d'),
                        'requests' => 12,
                        'delivered' => 12,
                    ],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get(route('admin.general_settings.email'));

        $response->assertOk();
        $response->assertInertia(function ($page) {
            $page->component('Admin/Modules/GeneralSettings/EmailSettings')
                ->where('settings.mail_from_name', 'Pháp Tạng Test')
                ->where('settings.mail_from_address', 'test@phaptang.com')
                ->where('settings.has_api_key', true)
                ->where('liveStats.success', true)
                ->where('liveStats.data.sent_today', 12)
                ->where('liveStats.data.daily_limit', 300)
                ->where('liveStats.data.remaining_today', 288);
        });
    }

    public function test_admin_can_update_email_settings(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.general_settings.email.update'), [
                'brevo_api_key' => 'xkeysib-secret-token-999',
                'mail_from_name' => 'Chùa Pháp Tạng',
                'mail_from_address' => 'thongbao@phaptang.vn',
            ]);

        $response->assertRedirect(route('admin.general_settings.email'));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('general_settings', [
            'setting_name' => 'brevo_api_key',
            'setting_value' => 'xkeysib-secret-token-999',
            'group' => 'email',
            'is_secret' => true,
        ]);

        $this->assertDatabaseHas('general_settings', [
            'setting_name' => 'mail_from_name',
            'setting_value' => 'Chùa Pháp Tạng',
            'group' => 'email',
        ]);

        $this->assertDatabaseHas('general_settings', [
            'setting_name' => 'mail_from_address',
            'setting_value' => 'thongbao@phaptang.vn',
            'group' => 'email',
        ]);

        $this->assertEquals('xkeysib-secret-token-999', $this->settingService->get('brevo_api_key'));
    }

    public function test_admin_can_test_brevo_connection_endpoint(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/account' => Http::response([
                'email' => 'connected@example.com',
                'companyName' => 'Pháp Tạng Test',
                'plan' => [
                    [
                        'type' => 'free',
                        'credits' => 300,
                    ],
                ],
            ], 200),
            'https://api.brevo.com/v3/smtp/statistics/reports*' => Http::response([
                'reports' => [
                    [
                        'date' => now()->format('Y-m-d'),
                        'requests' => 5,
                    ],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('admin.general_settings.email.test_connection'), [
                'brevo_api_key' => 'xkeysib-valid-key',
            ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'message' => 'Successfully connected to Brevo API.',
            'data' => [
                'email' => 'connected@example.com',
                'plan_type' => 'Free Plan',
                'daily_limit' => 300,
                'sent_today' => 5,
                'remaining_today' => 295,
            ],
        ]);
    }

    public function test_brevo_test_connection_handles_invalid_credentials(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/account' => Http::response([
                'message' => 'Key not found',
            ], 401),
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('admin.general_settings.email.test_connection'), [
                'brevo_api_key' => 'invalid-key',
            ]);

        $response->assertOk();
        $response->assertJson([
            'success' => false,
            'message' => 'Invalid Brevo API key. Authentication failed (401 Unauthorized).',
        ]);
    }

    public function test_admin_can_send_test_email(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response([
                'messageId' => '<20261007.12345@smtp-relay.brevo.com>',
            ], 201),
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('admin.general_settings.email.send_test'), [
                'recipient_email' => 'test-recipient@example.com',
                'brevo_api_key' => 'xkeysib-key',
            ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
        ]);
    }

    public function test_setting_service_handles_group_and_cache(): void
    {
        $this->settingService->set('site_title', 'Pháp Tạng Portal', 'general', true);
        $this->settingService->set('admin_phone', '0901234567', 'general');

        $this->assertEquals('Pháp Tạng Portal', $this->settingService->get('site_title'));
        $this->assertEquals('default_val', $this->settingService->get('non_existent', 'default_val'));

        $groupValues = $this->settingService->getGroupValues('general');
        $this->assertArrayHasKey('site_title', $groupValues);
        $this->assertArrayHasKey('admin_phone', $groupValues);

        $autoloaded = $this->settingService->getAutoloaded();
        $this->assertArrayHasKey('site_title', $autoloaded);
        $this->assertArrayNotHasKey('admin_phone', $autoloaded);

        $this->settingService->delete('site_title');
        $this->assertNull($this->settingService->get('site_title'));
    }
}

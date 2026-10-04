<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\DailyStaffBalance;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\TelegramAuthorizedUser;
use App\Modules\CashFlow\Models\TelegramSession;
use App\Modules\CashFlow\Services\TelegramBotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BalanceManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;
    protected User $seller;
    protected FinancialAccount $bankAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\App\Modules\CashFlow\database\seeders\CashFlowSeeder::class);

        $this->bankAccount = FinancialAccount::where('type', 'bank')->first();

        $this->manager = User::factory()->create([
            'role' => 'manager',
            'name' => 'Manager User',
            'financial_account_id' => $this->bankAccount->id,
        ]);

        $this->seller = User::factory()->create([
            'role' => 'seller',
            'name' => 'Seller User',
            'telegram_user_id' => 777888999,
            'financial_account_id' => $this->bankAccount->id,
        ]);

        TelegramAuthorizedUser::updateOrCreate(
            ['telegram_user_id' => 777888999],
            [
                'full_name' => $this->seller->name,
                'role' => 'seller',
                'is_active' => true,
            ]
        );

        Http::fake([
            'https://api.telegram.org/*' => Http::response(['ok' => true, 'result' => []], 200),
        ]);
    }

    public function test_manager_can_view_balances_index(): void
    {
        $response = $this->actingAs($this->manager)
            ->get(route('admin.cashflow.balances.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Modules/CashFlow/Balances/Index')
            ->has('balances')
            ->has('stats')
            ->has('staff_members')
            ->has('accounts')
        );
    }

    public function test_manager_can_assign_bank_account_to_user(): void
    {
        $response = $this->actingAs($this->manager)
            ->post(route('admin.cashflow.users.store'), [
                'name' => 'Staff With Bank',
                'email' => 'staffbank@test.local',
                'role' => 'seller',
                'telegram_user_id' => 99887766,
                'financial_account_id' => $this->bankAccount->id,
                'password' => 'secret123',
            ]);

        $response->assertRedirect(route('admin.cashflow.users.index'));
        $this->assertDatabaseHas('users', [
            'email' => 'staffbank@test.local',
            'financial_account_id' => $this->bankAccount->id,
        ]);
    }

    public function test_manager_can_store_and_update_balance_manually(): void
    {
        $today = now()->toDateString();

        $response = $this->actingAs($this->manager)
            ->post(route('admin.cashflow.balances.store'), [
                'date' => $today,
                'user_id' => $this->seller->id,
                'opening_balance' => 5000000,
                'closing_balance' => 8500000,
                'note' => 'Manual entry by manager',
            ]);

        $response->assertRedirect(route('admin.cashflow.balances.index', ['date' => $today]));
        
        $balance = DailyStaffBalance::where('user_id', $this->seller->id)
            ->whereDate('date', $today)
            ->first();

        $this->assertNotNull($balance);
        $this->assertEquals($this->bankAccount->id, $balance->account_id);
        $this->assertEquals(5000000, (float) $balance->opening_balance);
        $this->assertEquals(8500000, (float) $balance->closing_balance);
        $this->assertEquals('closed', $balance->status);

        // Update balance
        $updateResponse = $this->actingAs($this->manager)
            ->put(route('admin.cashflow.balances.update', $balance->id), [
                'opening_balance' => 6000000,
                'closing_balance' => 9000000,
                'status' => 'closed',
                'note' => 'Corrected numbers',
            ]);

        $updateResponse->assertRedirect(route('admin.cashflow.balances.index', ['date' => $today]));
        $balance->refresh();
        $this->assertEquals(6000000, (float) $balance->opening_balance);
        $this->assertEquals(9000000, (float) $balance->closing_balance);
        $this->assertEquals('Corrected numbers', $balance->note);
    }

    public function test_telegram_bot_intercepts_first_order_to_ask_for_opening_balance(): void
    {
        $botService = app(TelegramBotService::class);
        $chatId = 123456;
        $userId = 777888999;

        // 1. Staff triggers MODE_ORDER for the first time today
        $botService->handleUpdate([
            'message' => [
                'chat' => ['id' => $chatId],
                'from' => ['id' => $userId, 'username' => 'seller_bot'],
                'text' => 'MODE_ORDER',
            ],
        ]);

        $session = TelegramSession::where('telegram_chat_id', $chatId)->first();
        $this->assertNotNull($session);
        $this->assertEquals('opening_balance', $session->current_mode);
        $this->assertEquals(1, $session->current_step);

        // 2. Staff enters opening balance: e.g. "5,000,000"
        $botService->handleUpdate([
            'message' => [
                'chat' => ['id' => $chatId],
                'from' => ['id' => $userId, 'username' => 'seller_bot'],
                'text' => '5,000,000',
            ],
        ]);

        // Check DailyStaffBalance was created
        $today = now()->toDateString();
        $record = DailyStaffBalance::where('user_id', $this->seller->id)
            ->whereDate('date', $today)
            ->first();
        $this->assertNotNull($record);
        $this->assertEquals($this->bankAccount->id, $record->account_id);
        $this->assertEquals(5000000, (float) $record->opening_balance);

        // Session moves forward to order flow (e.g. branch or consultant selection)
        $session->refresh();
        $this->assertEquals('order', $session->current_mode);

        // 3. Triggering MODE_ORDER again on the same day should NOT ask for opening balance again
        $branch = Branch::first();
        $session->update(['selected_branch_id' => $branch->id, 'current_mode' => null, 'current_step' => 0]);

        $botService->handleUpdate([
            'message' => [
                'chat' => ['id' => $chatId],
                'from' => ['id' => $userId, 'username' => 'seller_bot'],
                'text' => 'MODE_ORDER',
            ],
        ]);

        $session->refresh();
        $this->assertEquals('order', $session->current_mode);
        $this->assertEquals(2, $session->current_step); // Directly at consultant selection!
    }

    public function test_telegram_bot_closing_balance_flow_and_overwrite(): void
    {
        $botService = app(TelegramBotService::class);
        $chatId = 654321;
        $userId = 777888999;
        $today = now()->toDateString();

        // Create opening balance
        DailyStaffBalance::create([
            'date' => $today,
            'user_id' => $this->seller->id,
            'account_id' => $this->bankAccount->id,
            'opening_balance' => 5000000,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        // 1. Staff triggers MODE_CLOSING_BALANCE
        $botService->handleUpdate([
            'callback_query' => [
                'message' => ['chat' => ['id' => $chatId]],
                'from' => ['id' => $userId],
                'data' => 'MODE_CLOSING_BALANCE',
            ],
        ]);

        $session = TelegramSession::where('telegram_chat_id', $chatId)->first();
        $this->assertEquals('closing_balance', $session->current_mode);

        // 2. Staff enters closing balance with shorthand "12.5tr"
        $botService->handleUpdate([
            'message' => [
                'chat' => ['id' => $chatId],
                'from' => ['id' => $userId],
                'text' => '12.5tr',
            ],
        ]);

        $record = DailyStaffBalance::where('user_id', $this->seller->id)
            ->whereDate('date', $today)
            ->first();
        $this->assertNotNull($record);
        $this->assertEquals(12500000, (float) $record->closing_balance);
        $this->assertEquals('closed', $record->status);

        // 3. Staff overwrites closing balance on the same day
        $botService->handleUpdate([
            'callback_query' => [
                'message' => ['chat' => ['id' => $chatId]],
                'from' => ['id' => $userId],
                'data' => 'MODE_CLOSING_BALANCE',
            ],
        ]);

        $botService->handleUpdate([
            'message' => [
                'chat' => ['id' => $chatId],
                'from' => ['id' => $userId],
                'text' => '13,000,000',
            ],
        ]);

        $record->refresh();
        $this->assertEquals(13000000, (float) $record->closing_balance);
        $this->assertEquals('closed', $record->status);
    }

    public function test_google_sheets_sync_balance(): void
    {
        config([
            'services.google_sheets.webhook_url' => 'https://script.google.com/macros/s/dummy/exec',
            'services.google_sheets.spreadsheet_id' => 'dummy_sheet_id',
        ]);

        Http::fake([
            'https://script.google.com/*' => Http::response(['status' => 'success'], 200),
        ]);

        $today = now()->toDateString();
        $balance = DailyStaffBalance::create([
            'date' => $today,
            'user_id' => $this->seller->id,
            'account_id' => $this->bankAccount->id,
            'opening_balance' => 5000000,
            'closing_balance' => 12500000,
            'opened_at' => now(),
            'closed_at' => now(),
            'status' => 'closed',
            'note' => 'Synced test',
        ]);

        $syncService = app(\App\Modules\CashFlow\Services\GoogleSheetsSyncService::class);
        $row = $syncService->formatBalanceRow($balance);

        $this->assertEquals($today, $row['date']);
        $this->assertEquals($this->seller->name, $row['staff_name']);
        $this->assertEquals($this->bankAccount->name, $row['account_name']);
        $this->assertEquals(5000000, $row['opening_balance']);
        $this->assertEquals(12500000, $row['closing_balance']);
        $this->assertEquals('closed', $row['status']);

        $success = $syncService->syncBalance($balance);
        $this->assertTrue($success);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://script.google.com/macros/s/dummy/exec' &&
                $request['sheet'] === 'Balance' &&
                isset($request['data'][0]['opening_balance']);
        });
    }

    public function test_manager_can_sync_balance_to_sheets_from_admin(): void
    {
        config([
            'services.google_sheets.webhook_url' => 'https://script.google.com/macros/s/dummy/exec',
            'services.google_sheets.spreadsheet_id' => 'dummy_sheet_id',
        ]);

        Http::fake([
            'https://script.google.com/*' => Http::response(['status' => 'success'], 200),
        ]);

        $balance = DailyStaffBalance::create([
            'date' => now()->toDateString(),
            'user_id' => $this->seller->id,
            'account_id' => $this->bankAccount->id,
            'opening_balance' => 3000000,
            'status' => 'open',
        ]);

        $response = $this->actingAs($this->manager)
            ->post(route('admin.cashflow.balances.sync-sheets', $balance->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');
    }

    public function test_google_sheets_cli_test_balance_sheet(): void
    {
        config([
            'services.google_sheets.webhook_url' => 'https://script.google.com/macros/s/dummy/exec',
            'services.google_sheets.spreadsheet_id' => 'dummy_sheet_id',
        ]);

        Http::fake([
            'https://script.google.com/*' => Http::response(['status' => 'success'], 200),
        ]);

        $this->artisan('google-sheets:test --sheet=Balance')
            ->assertExitCode(0);
    }

    public function test_index_loads_all_users_and_store_supports_account_selection(): void
    {
        $unassignedUser = User::factory()->create([
            'role' => 'seller',
            'name' => 'Unassigned Staff',
            'financial_account_id' => null,
        ]);

        $response = $this->actingAs($this->manager)
            ->get(route('admin.cashflow.balances.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Modules/CashFlow/Balances/Index')
            ->has('staff_members')
        );

        $staffIds = collect($response->original->getData()['page']['props']['staff_members'])->pluck('id');
        $this->assertTrue($staffIds->contains($unassignedUser->id));

        $today = now()->toDateString();

        $createResponse = $this->actingAs($this->manager)
            ->post(route('admin.cashflow.balances.store'), [
                'date' => $today,
                'user_id' => $unassignedUser->id,
                'account_id' => $this->bankAccount->id,
                'opening_balance' => 2000000,
            ]);

        $createResponse->assertRedirect(route('admin.cashflow.balances.index', ['date' => $today]));

        $unassignedUser->refresh();
        $this->assertEquals($this->bankAccount->id, $unassignedUser->financial_account_id);

        $this->assertDatabaseHas('daily_staff_balances', [
            'user_id' => $unassignedUser->id,
            'account_id' => $this->bankAccount->id,
            'opening_balance' => 2000000,
        ]);
    }
}

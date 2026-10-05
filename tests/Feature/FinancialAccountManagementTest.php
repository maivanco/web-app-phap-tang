<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\Expense;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\InitialBalance;
use App\Modules\CashFlow\Models\InternalTransfer;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Models\OrderPayment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialAccountManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $manager;
    protected User $seller;
    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\App\Modules\CashFlow\database\seeders\CashFlowSeeder::class);

        $this->branch = Branch::first();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'name' => 'Admin User',
            'email' => 'admin_fa_test@example.com',
        ]);

        $this->manager = User::factory()->create([
            'role' => 'manager',
            'name' => 'Manager User',
            'email' => 'manager_fa_test@example.com',
        ]);

        $this->seller = User::factory()->create([
            'role' => 'seller',
            'name' => 'Seller User',
            'email' => 'seller_fa_test@example.com',
        ]);
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $response = $this->get(route('admin.cashflow.financial-accounts.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_seller_cannot_view_financial_accounts(): void
    {
        $response = $this->actingAs($this->seller)->get(route('admin.cashflow.financial-accounts.index'));
        $response->assertForbidden();
    }

    public function test_admin_and_manager_can_view_financial_accounts_index(): void
    {
        $response = $this->actingAs($this->admin)->get(route('admin.cashflow.financial-accounts.index'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Modules/CashFlow/FinancialAccounts/Index')
            ->has('accounts.data')
            ->has('stats')
            ->has('branches')
        );

        $responseManager = $this->actingAs($this->manager)->get(route('admin.cashflow.financial-accounts.index'));
        $responseManager->assertOk();
    }

    public function test_admin_can_filter_financial_accounts(): void
    {
        $response = $this->actingAs($this->admin)->get(route('admin.cashflow.financial-accounts.index', [
            'type' => 'bank',
            'search' => 'BANK_A',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Modules/CashFlow/FinancialAccounts/Index')
            ->where('filters.type', 'bank')
            ->where('filters.search', 'BANK_A')
        );
    }

    public function test_admin_can_create_financial_account_with_initial_balance(): void
    {
        $payload = [
            'code' => 'bank_test_01',
            'letter_code' => 't1',
            'name' => 'Test Bank Account',
            'type' => 'bank',
            'branch_id' => null,
            'status' => 'active',
            'initial_amount' => 5000000,
            'initial_date' => '2026-01-01',
            'initial_note' => 'Initial test amount',
        ];

        $response = $this->actingAs($this->admin)->post(
            route('admin.cashflow.financial-accounts.store'),
            $payload
        );

        $response->assertRedirect(route('admin.cashflow.financial-accounts.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('financial_accounts', [
            'code' => 'BANK_TEST_01',
            'letter_code' => 'T1',
            'name' => 'Test Bank Account',
            'type' => 'bank',
            'status' => 'active',
        ]);

        $createdAccount = FinancialAccount::where('code', 'BANK_TEST_01')->first();
        $this->assertNotNull($createdAccount);

        $initialBalance = InitialBalance::where('account_id', $createdAccount->id)->first();
        $this->assertNotNull($initialBalance);
        $this->assertEquals(5000000, (float) $initialBalance->initial_amount);
        $this->assertEquals('2026-01-01', $initialBalance->effective_date->toDateString());
        $this->assertEquals('Initial test amount', $initialBalance->note);
        $this->assertEquals($this->admin->id, $initialBalance->created_by);
    }

    public function test_create_validation_rules_enforced(): void
    {
        $response = $this->actingAs($this->admin)->post(
            route('admin.cashflow.financial-accounts.store'),
            []
        );

        $response->assertSessionHasErrors(['code', 'name', 'type', 'status']);
    }

    public function test_create_rejects_duplicate_account_code(): void
    {
        $existing = FinancialAccount::first();

        $payload = [
            'code' => $existing->code,
            'name' => 'Duplicate Code Test',
            'type' => 'cash',
            'branch_id' => $this->branch->id,
            'status' => 'active',
        ];

        $response = $this->actingAs($this->admin)->post(
            route('admin.cashflow.financial-accounts.store'),
            $payload
        );

        $response->assertSessionHasErrors(['code']);
    }

    public function test_admin_can_update_financial_account(): void
    {
        $account = FinancialAccount::create([
            'code' => 'ACC_TO_UPDATE',
            'letter_code' => 'U1',
            'name' => 'Before Update Name',
            'type' => 'cash',
            'branch_id' => $this->branch->id,
            'status' => 'active',
        ]);

        $payload = [
            'code' => 'ACC_TO_UPDATE',
            'letter_code' => 'U2',
            'name' => 'After Update Name',
            'type' => 'cash',
            'branch_id' => $this->branch->id,
            'status' => 'inactive',
            'initial_amount' => 2000000,
            'initial_date' => '2026-02-01',
            'initial_note' => 'Updated initial amount',
        ];

        $response = $this->actingAs($this->admin)->put(
            route('admin.cashflow.financial-accounts.update', $account->id),
            $payload
        );

        $response->assertRedirect(route('admin.cashflow.financial-accounts.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('financial_accounts', [
            'id' => $account->id,
            'letter_code' => 'U2',
            'name' => 'After Update Name',
            'status' => 'inactive',
        ]);

        $initialBalance = InitialBalance::where('account_id', $account->id)->first();
        $this->assertNotNull($initialBalance);
        $this->assertEquals(2000000, (float) $initialBalance->initial_amount);
        $this->assertEquals('2026-02-01', $initialBalance->effective_date->toDateString());
    }

    public function test_admin_can_delete_unused_financial_account(): void
    {
        $account = FinancialAccount::create([
            'code' => 'UNUSED_ACC',
            'letter_code' => 'UN',
            'name' => 'Unused Account',
            'type' => 'bank',
            'status' => 'active',
        ]);

        InitialBalance::create([
            'account_id' => $account->id,
            'effective_date' => '2026-01-01',
            'initial_amount' => 100000,
            'note' => 'Unused',
        ]);

        $response = $this->actingAs($this->admin)->delete(
            route('admin.cashflow.financial-accounts.destroy', $account->id)
        );

        $response->assertRedirect(route('admin.cashflow.financial-accounts.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('financial_accounts', ['id' => $account->id]);
        $this->assertDatabaseMissing('initial_balances', ['account_id' => $account->id]);
    }

    public function test_cannot_delete_account_with_linked_transactions(): void
    {
        $account = FinancialAccount::where('type', 'bank')->first();

        // Create an expense linked to this account
        Expense::create([
            'expense_code' => 'EXP-TEST-999',
            'expense_date' => '2026-03-01',
            'branch_id' => $this->branch->id,
            'spender_name' => 'Tester',
            'content' => 'Test expense preventing delete',
            'quantity' => 1,
            'unit_price' => 50000,
            'total_amount' => 50000,
            'method' => 'bank_transfer',
            'account_id' => $account->id,
            'status' => 'completed',
        ]);

        $response = $this->actingAs($this->admin)->delete(
            route('admin.cashflow.financial-accounts.destroy', $account->id)
        );

        $response->assertSessionHas('error');
        $this->assertDatabaseHas('financial_accounts', ['id' => $account->id]);
    }
}

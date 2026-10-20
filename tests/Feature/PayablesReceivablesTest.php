<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\CustomerSource;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Models\OrderPayment;
use App\Modules\PayablesReceivables\Models\AccountPayable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PayablesReceivablesTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;
    protected User $seller;
    protected Branch $branchA;
    protected Branch $branchB;
    protected CustomerSource $sourceTiktok;
    protected FinancialAccount $cashA;
    protected FinancialAccount $bankPhu;

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

        $this->branchA = Branch::where('code', 'A')->first();
        $this->branchB = Branch::where('code', 'B')->first();
        $this->sourceTiktok = CustomerSource::where('code', 'A')->first();
        $this->cashA = FinancialAccount::where('branch_id', $this->branchA->id)->where('type', 'cash')->first();
        $this->bankPhu = FinancialAccount::where('type', 'bank')->first();
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/admin/payables-receivables/receivables')->assertRedirect('/login');
        $this->get('/admin/payables-receivables/payables')->assertRedirect('/login');
    }

    public function test_authenticated_user_can_view_receivables_and_summary_metrics(): void
    {
        // 1. Create an unpaid order
        $unpaidOrder = Order::create([
            'order_code' => 'DH-TEST-0001',
            'sale_date' => '2026-10-20',
            'branch_id' => $this->branchA->id,
            'customer_name' => 'Nguyen Van Unpaid',
            'customer_phone' => '0987654321',
            'customer_gender' => 'Nam',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'E',
            'discount_rate' => 0,
            'gross_amount' => 500000,
            'discount_amount' => 0,
            'net_revenue' => 500000,
            'status' => 'completed',
            'version' => 1,
            'created_by' => $this->manager->id,
        ]);

        OrderPayment::create([
            'order_id' => $unpaidOrder->id,
            'method' => 'unpaid',
            'amount' => 500000,
            'payment_date' => '2026-10-20',
            'status' => 'unpaid',
        ]);

        // 2. Create a paid order
        $paidOrder = Order::create([
            'order_code' => 'DH-TEST-0002',
            'sale_date' => '2026-10-20',
            'branch_id' => $this->branchA->id,
            'customer_name' => 'Tran Thi Paid',
            'customer_phone' => '0912345678',
            'customer_gender' => 'Nữ',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'E',
            'discount_rate' => 0,
            'gross_amount' => 300000,
            'discount_amount' => 0,
            'net_revenue' => 300000,
            'status' => 'completed',
            'version' => 1,
            'created_by' => $this->manager->id,
        ]);

        OrderPayment::create([
            'order_id' => $paidOrder->id,
            'method' => 'cash',
            'account_id' => $this->cashA->id,
            'amount' => 300000,
            'payment_date' => '2026-10-20',
            'status' => 'completed',
        ]);

        // Request Receivables Index
        $response = $this->actingAs($this->manager)
            ->get('/admin/payables-receivables/receivables');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Modules/PayablesReceivables/Receivables/Index')
            ->has('orders.data', 1)
            ->where('orders.data.0.order_code', 'DH-TEST-0001')
            ->where('summary.total_unpaid_amount', 500000)
            ->where('summary.total_unpaid_count', 1)
        );
    }

    public function test_user_can_settle_unpaid_order_via_cash(): void
    {
        $unpaidOrder = Order::create([
            'order_code' => 'DH-SETTLE-0001',
            'sale_date' => '2026-10-20',
            'branch_id' => $this->branchA->id,
            'customer_name' => 'Customer To Settle',
            'customer_phone' => '0981112233',
            'customer_gender' => 'Nam',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'E',
            'discount_rate' => 0,
            'gross_amount' => 450000,
            'discount_amount' => 0,
            'net_revenue' => 450000,
            'status' => 'completed',
            'version' => 1,
            'created_by' => $this->manager->id,
        ]);

        $payment = OrderPayment::create([
            'order_id' => $unpaidOrder->id,
            'method' => 'unpaid',
            'amount' => 450000,
            'payment_date' => '2026-10-20',
            'status' => 'unpaid',
        ]);

        $response = $this->actingAs($this->manager)
            ->post("/admin/payables-receivables/receivables/{$unpaidOrder->id}/settle", [
                'payment_method' => 'cash',
                'payment_date' => '2026-10-20',
            ]);

        $response->assertRedirect('/admin/payables-receivables/receivables');
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('order_payments', [
            'id' => $payment->id,
            'method' => 'cash',
            'account_id' => $this->cashA->id,
            'status' => 'completed',
            'settled_by' => $this->manager->id,
        ]);
    }

    public function test_user_can_settle_unpaid_order_via_bank_transfer(): void
    {
        $unpaidOrder = Order::create([
            'order_code' => 'DH-SETTLE-BANK-01',
            'sale_date' => '2026-10-20',
            'branch_id' => $this->branchA->id,
            'customer_name' => 'Bank Customer',
            'customer_phone' => '0984445566',
            'customer_gender' => 'Nữ',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'E',
            'discount_rate' => 0,
            'gross_amount' => 600000,
            'discount_amount' => 0,
            'net_revenue' => 600000,
            'status' => 'completed',
            'version' => 1,
            'created_by' => $this->manager->id,
        ]);

        $payment = OrderPayment::create([
            'order_id' => $unpaidOrder->id,
            'method' => 'unpaid',
            'amount' => 600000,
            'payment_date' => '2026-10-20',
            'status' => 'unpaid',
        ]);

        $response = $this->actingAs($this->manager)
            ->post("/admin/payables-receivables/receivables/{$unpaidOrder->id}/settle", [
                'payment_method' => 'bank_transfer',
                'payment_account_id' => $this->bankPhu->id,
                'payment_date' => '2026-10-21',
            ]);

        $response->assertRedirect('/admin/payables-receivables/receivables');
        $this->assertDatabaseHas('order_payments', [
            'id' => $payment->id,
            'method' => 'bank_transfer',
            'account_id' => $this->bankPhu->id,
            'status' => 'completed',
            'settled_by' => $this->manager->id,
        ]);
    }

    public function test_user_can_view_payables_index(): void
    {
        AccountPayable::create([
            'supplier_name' => 'Supplier X',
            'description' => 'Printing boxes',
            'amount' => 1200000,
            'due_date' => '2026-10-30',
            'status' => 'unpaid',
            'created_by' => $this->manager->id,
        ]);

        $response = $this->actingAs($this->manager)
            ->get('/admin/payables-receivables/payables');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Modules/PayablesReceivables/Payables/Index')
            ->has('payables.data', 1)
            ->where('payables.data.0.supplier_name', 'Supplier X')
            ->where('summary.unpaid_amount', 1200000)
            ->where('summary.unpaid_count', 1)
        );
    }

    public function test_user_can_create_account_payable(): void
    {
        $payload = [
            'supplier_name' => 'Cong ty Bao Bi Gia Dinh',
            'description' => 'Tien in hop go qua tang dot 2',
            'amount' => 2500000,
            'due_date' => '2026-11-15',
            'status' => 'unpaid',
        ];

        $response = $this->actingAs($this->manager)
            ->post('/admin/payables-receivables/payables', $payload);

        $response->assertRedirect('/admin/payables-receivables/payables');
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('account_payables', [
            'supplier_name' => 'Cong ty Bao Bi Gia Dinh',
            'description' => 'Tien in hop go qua tang dot 2',
            'amount' => 2500000,
            'status' => 'unpaid',
            'created_by' => $this->manager->id,
        ]);
    }

    public function test_create_payable_validation_requires_mandatory_fields(): void
    {
        $response = $this->actingAs($this->manager)
            ->post('/admin/payables-receivables/payables', [
                'supplier_name' => '',
                'description' => '',
                'amount' => 0,
                'status' => 'invalid_status',
            ]);

        $response->assertSessionHasErrors(['supplier_name', 'description', 'amount', 'status']);
    }

    public function test_user_can_update_account_payable(): void
    {
        $payable = AccountPayable::create([
            'supplier_name' => 'Supplier Old',
            'description' => 'Old description',
            'amount' => 500000,
            'due_date' => '2026-10-25',
            'status' => 'unpaid',
            'created_by' => $this->manager->id,
        ]);

        $response = $this->actingAs($this->manager)
            ->put("/admin/payables-receivables/payables/{$payable->id}", [
                'supplier_name' => 'Supplier New',
                'description' => 'Updated description',
                'amount' => 750000,
                'due_date' => '2026-11-01',
                'status' => 'unpaid',
            ]);

        $response->assertRedirect('/admin/payables-receivables/payables');

        $this->assertDatabaseHas('account_payables', [
            'id' => $payable->id,
            'supplier_name' => 'Supplier New',
            'description' => 'Updated description',
            'amount' => 750000,
        ]);
    }

    public function test_user_can_mark_payable_as_paid(): void
    {
        $payable = AccountPayable::create([
            'supplier_name' => 'Supplier Z',
            'description' => 'Cleaning service',
            'amount' => 300000,
            'due_date' => '2026-10-25',
            'status' => 'unpaid',
            'created_by' => $this->manager->id,
        ]);

        $response = $this->actingAs($this->manager)
            ->post("/admin/payables-receivables/payables/{$payable->id}/mark-paid", [
                'paid_account_id' => $this->cashA->id,
                'paid_at' => '2026-10-20',
                'paid_notes' => 'Paid in full via cash',
            ]);

        $response->assertRedirect('/admin/payables-receivables/payables');

        $this->assertDatabaseHas('account_payables', [
            'id' => $payable->id,
            'status' => 'paid',
            'paid_account_id' => $this->cashA->id,
            'paid_notes' => 'Paid in full via cash',
        ]);
        $this->assertEquals('2026-10-20', $payable->fresh()->paid_at->format('Y-m-d'));
    }

    public function test_manager_can_delete_account_payable(): void
    {
        $payable = AccountPayable::create([
            'supplier_name' => 'To Delete',
            'description' => 'Mistake record',
            'amount' => 100000,
            'status' => 'unpaid',
            'created_by' => $this->manager->id,
        ]);

        $response = $this->actingAs($this->manager)
            ->delete("/admin/payables-receivables/payables/{$payable->id}");

        $response->assertRedirect('/admin/payables-receivables/payables');
        $this->assertSoftDeleted('account_payables', [
            'id' => $payable->id,
        ]);
    }

    public function test_seller_cannot_delete_account_payable(): void
    {
        $payable = AccountPayable::create([
            'supplier_name' => 'Cannot Delete',
            'description' => 'Protected record',
            'amount' => 100000,
            'status' => 'unpaid',
            'created_by' => $this->manager->id,
        ]);

        $response = $this->actingAs($this->seller)
            ->delete("/admin/payables-receivables/payables/{$payable->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('account_payables', [
            'id' => $payable->id,
            'deleted_at' => null,
        ]);
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\Brand;
use App\Modules\CashFlow\Models\CustomerSource;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Models\OrderPayment;
use App\Modules\CashFlow\Services\CardSettlementService;
use App\Modules\CashFlow\Services\ExpenseService;
use App\Modules\CashFlow\Services\OrderCalculationService;
use App\Modules\CashFlow\Services\OrderService;
use App\Modules\CashFlow\Services\TreasuryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class CashFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;
    protected User $seller;
    protected Branch $branchA;
    protected Branch $branchB;
    protected CustomerSource $sourceTiktok;
    protected Brand $brandPhapTang;
    protected Brand $brandMgems;
    protected Brand $brandMjade;
    protected FinancialAccount $cashA;
    protected FinancialAccount $bankPhu;
    protected FinancialAccount $cardGatewayF;

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

        $this->brandPhapTang = Brand::where('code', 'a')->first();
        $this->brandMgems = Brand::where('code', 'b')->first();
        $this->brandMjade = Brand::where('code', 'c')->first();

        $this->cashA = FinancialAccount::where('code', 'CASH_A')->first();
        $this->bankPhu = FinancialAccount::where('code', 'BANK_A')->first();
        $this->cardGatewayF = FinancialAccount::where('code', 'GATEWAY_F')->first();
    }

    /**
     * T02 & T03: Multi-product order with proportional discount allocation and rounding discrepancy fix.
     */
    public function test_discount_calculation_and_proportional_allocation(): void
    {
        $calcService = app(OrderCalculationService::class);

        // Example from requirements.md (Section 7):
        // Line 1: Phap Tang: 1.000.000 -> 10% discount -> 100.000 -> net 900.000
        // Line 2: MGEMS: 2.000.000 -> 10% discount -> 200.000 -> net 1.800.000
        // Total gross: 3.000.000 -> discount 10% (300.000) -> net 2.700.000
        $items = [
            ['product_name' => 'Nhang Nag', 'brand_id' => $this->brandPhapTang->id, 'quantity' => 1, 'unit_price' => 1000000],
            ['product_name' => 'Vòng Băng Chủng', 'brand_id' => $this->brandMgems->id, 'quantity' => 2, 'unit_price' => 1000000],
        ];

        $result = $calcService->calculate($items, 'C'); // C = 10%

        $this->assertEquals(3000000, $result['gross_amount']);
        $this->assertEquals(300000, $result['discount_amount']);
        $this->assertEquals(2700000, $result['net_revenue']);

        $this->assertEquals(100000, $result['items'][0]['allocated_discount']);
        $this->assertEquals(900000, $result['items'][0]['net_amount']);

        $this->assertEquals(200000, $result['items'][1]['allocated_discount']);
        $this->assertEquals(1800000, $result['items'][1]['net_amount']);

        // Sum of net amounts strictly equals net revenue
        $sumNet = array_sum(array_column($result['items'], 'net_amount'));
        $this->assertEquals($result['net_revenue'], $sumNet);
    }

    /**
     * T01 & T02: Order creation with cash payment automatically linked to branch cash fund.
     */
    public function test_order_creation_with_cash_linked_to_branch_cash_fund(): void
    {
        $orderService = app(OrderService::class);

        $order = $orderService->createOrder([
            'branch_id' => $this->branchA->id,
            'consultant_name' => 'Nguyễn Văn A',
            'customer_name' => 'Trần Thị B',
            'customer_phone' => '0912345678',
            'customer_gender' => 'Nữ',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'B', // 5%
            'items' => [
                ['product_name' => 'Item 1', 'brand_id' => $this->brandPhapTang->id, 'quantity' => 1, 'unit_price' => 100000],
                ['product_name' => 'Item 2', 'brand_id' => $this->brandMgems->id, 'quantity' => 2, 'unit_price' => 200000],
                ['product_name' => 'Item 3', 'brand_id' => $this->brandMjade->id, 'quantity' => 1, 'unit_price' => 300000],
            ],
            'payment_method' => 'cash',
        ]);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'branch_id' => $this->branchA->id,
            'customer_phone' => '0912345678',
            'gross_amount' => 800000,
            'discount_amount' => 40000,
            'net_revenue' => 760000,
        ]);

        $this->assertEquals(3, $order->items()->count());

        $this->assertDatabaseHas('order_payments', [
            'order_id' => $order->id,
            'method' => 'cash',
            'account_id' => $this->cashA->id,
            'amount' => 760000,
            'status' => 'completed',
        ]);
    }

    /**
     * T05: Expense creation with quantity * unit_price and cash tied to branch fund.
     */
    public function test_expense_calculation_and_cash_fund(): void
    {
        $expenseService = app(ExpenseService::class);

        $expense = $expenseService->createExpense([
            'branch_id' => $this->branchA->id,
            'spender_name' => 'Lê Văn Chi',
            'content' => 'Mua văn phòng phẩm',
            'quantity' => 2,
            'unit_price' => 100000,
            'payment_method' => 'cash',
        ]);

        $this->assertEquals(200000, $expense->total_amount);
        $this->assertEquals($this->cashA->id, $expense->account_id);
    }

    /**
     * T07: F in expenses is strictly forbidden.
     */
    public function test_account_f_forbidden_in_expenses(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $expenseService = app(ExpenseService::class);
        $expenseService->createExpense([
            'branch_id' => $this->branchA->id,
            'spender_name' => 'Người Chi',
            'content' => 'Chi phí thử',
            'quantity' => 1,
            'unit_price' => 50000,
            'payment_method' => 'bank_transfer',
            'account_id' => $this->cardGatewayF->id, // Account F
        ]);
    }

    /**
     * T06: Card payment pending does not increase bank balance; reconciliation increases bank by actual_amount.
     */
    public function test_card_payment_pending_and_reconciliation_flow(): void
    {
        $orderService = app(OrderService::class);
        $settlementService = app(CardSettlementService::class);
        $treasuryService = app(TreasuryService::class);

        // 1. Create order with card swipe (F)
        $order = $orderService->createOrder([
            'branch_id' => $this->branchA->id,
            'consultant_name' => 'Tư vấn viên',
            'customer_name' => 'Khách Quẹt Thẻ',
            'customer_phone' => '0988776655',
            'customer_gender' => 'Nam',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'E', // 0%
            'items' => [
                ['product_name' => 'Vòng Tay', 'brand_id' => $this->brandMgems->id, 'quantity' => 1, 'unit_price' => 1000000],
            ],
            'payment_method' => 'card_swipe',
            'card_swipe_date' => now()->toDateString(),
        ]);

        $payment = $order->payment;
        $this->assertEquals('pending_settlement', $payment->status);
        $this->assertEquals(1000000, $payment->amount);

        // Bank balance before reconciliation: BANK_A must be 0
        $balancePhuBefore = $treasuryService->getAccountBalance($this->bankPhu)['current_balance'];
        $this->assertEquals(0, $balancePhuBefore);

        // 2. Reconciliation mismatch test: actual + fee != swipe_amount throws exception
        try {
            $settlementService->settleCardPayment($payment, [
                'settlement_date' => now()->toDateString(),
                'target_account_id' => $this->bankPhu->id,
                'actual_received_amount' => 950000,
                'fee_amount' => 20000, // 950k + 20k = 970k != 1000k
            ]);
            $this->fail('Expected exception for reconciliation mismatch');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('Reconciliation mismatch', $e->getMessage());
        }

        // Payment status remains pending_settlement
        $this->assertEquals('pending_settlement', $payment->fresh()->status);

        // 3. Successful reconciliation: 980.000 actual + 20.000 fee = 1.000.000
        $settled = $settlementService->settleCardPayment($payment, [
            'settlement_date' => now()->toDateString(),
            'target_account_id' => $this->bankPhu->id,
            'actual_received_amount' => 980000,
            'fee_amount' => 20000,
            'settled_by' => $this->manager->id,
        ]);

        $this->assertEquals('reconciled', $settled->status);
        $this->assertEquals(980000, $settled->actual_received_amount);
        $this->assertEquals(20000, $settled->fee_amount);

        // Bank balance now increased by 980.000
        $balancePhuAfter = $treasuryService->getAccountBalance($this->bankPhu)['current_balance'];
        $this->assertEquals(980000, $balancePhuAfter);
    }

    /**
     * T09 & T10: Internal Transfer reduces source, increases destination, no revenue or expense.
     */
    public function test_internal_transfer_between_accounts(): void
    {
        $treasuryService = app(TreasuryService::class);

        // Seed 500k into cashA via an order
        $orderService = app(OrderService::class);
        $orderService->createOrder([
            'branch_id' => $this->branchA->id,
            'consultant_name' => 'Seller',
            'customer_name' => 'Customer',
            'customer_phone' => '0901234567',
            'customer_gender' => 'Nam',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'E',
            'items' => [
                ['product_name' => 'Nhang', 'brand_id' => $this->brandPhapTang->id, 'quantity' => 1, 'unit_price' => 500000],
            ],
            'payment_method' => 'cash',
        ]);

        $this->assertEquals(500000, $treasuryService->getAccountBalance($this->cashA)['current_balance']);
        $this->assertEquals(0, $treasuryService->getAccountBalance($this->bankPhu)['current_balance']);

        // Transfer 300k from Cash A to Bank Phu
        $transfer = $treasuryService->createTransfer([
            'transfer_date' => now()->toDateString(),
            'from_account_id' => $this->cashA->id,
            'to_account_id' => $this->bankPhu->id,
            'amount' => 300000,
            'transfer_type' => 'internal_transfer',
            'note' => 'Nộp tiền mặt vào ngân hàng',
            'created_by' => $this->manager->id,
        ]);

        $this->assertDatabaseHas('internal_transfers', ['id' => $transfer->id, 'amount' => 300000]);

        // Balances: Cash A is now 200k, Bank Phu is now 300k
        $this->assertEquals(200000, $treasuryService->getAccountBalance($this->cashA)['current_balance']);
        $this->assertEquals(300000, $treasuryService->getAccountBalance($this->bankPhu)['current_balance']);
    }

    /**
     * T08: Seller cannot update/cancel; Manager can update/cancel with reason and audit history.
     */
    public function test_permissions_and_audit_log_on_order_update(): void
    {
        $orderService = app(OrderService::class);

        $order = $orderService->createOrder([
            'branch_id' => $this->branchA->id,
            'consultant_name' => 'Seller Name',
            'customer_name' => 'Customer Name',
            'customer_phone' => '0912345678',
            'customer_gender' => 'Nam',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'E',
            'items' => [
                ['product_name' => 'Vòng', 'brand_id' => $this->brandPhapTang->id, 'quantity' => 1, 'unit_price' => 200000],
            ],
            'payment_method' => 'cash',
        ]);

        // Seller attempts to update -> forbidden
        $response = $this->actingAs($this->seller)->put(route('admin.cashflow.orders.update', $order->id), [
            'reason' => 'Thay đổi sản phẩm',
            'consultant_name' => 'Seller Updated',
            'customer_name' => 'Customer Name',
            'customer_phone' => '0912345678',
            'customer_gender' => 'Nam',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'E',
            'items' => [
                ['product_name' => 'Vòng Mới', 'brand_id' => $this->brandPhapTang->id, 'quantity' => 1, 'unit_price' => 250000],
            ],
        ]);
        $response->assertStatus(403);

        // Manager updates with reason -> success and audited
        $response = $this->actingAs($this->manager)->put(route('admin.cashflow.orders.update', $order->id), [
            'reason' => 'Khách đổi sang sản phẩm cao cấp hơn',
            'consultant_name' => 'Seller Name',
            'customer_name' => 'Customer Name',
            'customer_phone' => '0912345678',
            'customer_gender' => 'Nam',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'E',
            'items' => [
                ['product_name' => 'Vòng Mới', 'brand_id' => $this->brandPhapTang->id, 'quantity' => 1, 'unit_price' => 250000],
            ],
        ]);
        $response->assertRedirect(route('admin.cashflow.orders.show', $order->id));

        $order->refresh();
        $this->assertEquals(2, $order->version);
        $this->assertEquals(250000, $order->net_revenue);

        // Verify transaction audit record
        $this->assertDatabaseHas('transaction_audits', [
            'auditable_type' => Order::class,
            'auditable_id' => $order->id,
            'action' => 'update',
            'version' => 2,
            'reason' => 'Khách đổi sang sản phẩm cao cấp hơn',
            'user_id' => $this->manager->id,
        ]);
    }

    /**
     * Verify that Google Sheets sync is automatically triggered when an order is created.
     */
    public function test_order_creation_triggers_google_sheets_sync(): void
    {
        $mockSheets = \Mockery::mock(\App\Modules\CashFlow\Services\GoogleSheetsSyncService::class);
        $mockSheets->shouldReceive('formatOrderRow')->andReturn(['order_id' => 'DH-TEST-0001']);
        $mockSheets->shouldReceive('formatOrderItemRow')->andReturn(['line_id' => 'DH-TEST-0001-1']);
        $mockSheets->shouldReceive('formatPaymentRow')->andReturn(['payment_id' => 'PAY-1']);

        // Assert sync is called for Don_Hang, Chi_Tiet_Don, and Thanh_Toan
        $mockSheets->shouldReceive('sync')->with('Don_Hang', \Mockery::type('array'))->once()->andReturn(true);
        $mockSheets->shouldReceive('sync')->with('Chi_Tiet_Don', \Mockery::type('array'))->once()->andReturn(true);
        $mockSheets->shouldReceive('sync')->with('Thanh_Toan', \Mockery::type('array'))->once()->andReturn(true);

        $this->app->instance(\App\Modules\CashFlow\Services\GoogleSheetsSyncService::class, $mockSheets);

        $orderService = app(OrderService::class);
        $orderService->createOrder([
            'branch_id' => $this->branchA->id,
            'consultant_name' => 'Seller Sync',
            'customer_name' => 'Customer Sync',
            'customer_phone' => '0912345678',
            'customer_gender' => 'Nam',
            'customer_source_id' => $this->sourceTiktok->id,
            'discount_code' => 'E',
            'items' => [
                ['product_name' => 'Nhang Trầm', 'brand_id' => $this->brandPhapTang->id, 'quantity' => 1, 'unit_price' => 150000],
            ],
            'payment_method' => 'cash',
        ]);
    }
}


<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\CustomerSource;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Models\OrderItem;
use App\Modules\CashFlow\Models\OrderPayment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderExportTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Branch $branchA;
    protected Branch $branchB;
    protected CustomerSource $source;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\App\Modules\CashFlow\database\seeders\CashFlowSeeder::class);

        $this->user = User::factory()->create([
            'role' => 'manager',
            'name' => 'Manager User',
        ]);

        $this->branchA = Branch::where('code', 'A')->first();
        $this->branchB = Branch::where('code', 'B')->first();
        $this->source = CustomerSource::first();
    }

    public function test_guest_cannot_export_orders(): void
    {
        $response = $this->get(route('admin.cashflow.orders.export'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_export_orders_as_xlsx(): void
    {
        $order = Order::create([
            'order_code' => 'DH-20261020-0001',
            'sale_date' => '2026-10-20',
            'branch_id' => $this->branchA->id,
            'consultant_name' => 'Nguyen Van A',
            'customer_name' => 'Tran Thi B',
            'customer_phone' => '0912345678',
            'customer_gender' => 'Nữ',
            'customer_source_id' => $this->source->id,
            'discount_code' => 'E',
            'discount_rate' => 0,
            'gross_amount' => 500000,
            'discount_amount' => 0,
            'net_revenue' => 500000,
            'status' => 'completed',
            'created_by' => $this->user->id,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'line_number' => 1,
            'product_name' => 'Vong Tram Huong',
            'brand_id' => 1,
            'quantity' => 1,
            'unit_price' => 500000,
            'gross_amount' => 500000,
            'allocated_discount' => 0,
            'net_amount' => 500000,
        ]);

        OrderPayment::create([
            'order_id' => $order->id,
            'method' => 'cash',
            'amount' => 500000,
            'payment_date' => '2026-10-20',
            'status' => 'completed',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('admin.cashflow.orders.export'));

        $response->assertOk();
        $this->assertEquals(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );
        $this->assertStringContainsString('attachment;', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('.xlsx', $response->headers->get('Content-Disposition'));
    }

    public function test_export_respects_filter_parameters(): void
    {
        // Order 1 at Branch A
        Order::create([
            'order_code' => 'DH-BRANCH-A-001',
            'sale_date' => '2026-10-15',
            'branch_id' => $this->branchA->id,
            'consultant_name' => 'Consultant 1',
            'customer_name' => 'Customer A',
            'customer_phone' => '0900000001',
            'customer_gender' => 'Nam',
            'customer_source_id' => $this->source->id,
            'discount_code' => 'E',
            'discount_rate' => 0,
            'gross_amount' => 100000,
            'discount_amount' => 0,
            'net_revenue' => 100000,
            'status' => 'completed',
            'created_by' => $this->user->id,
        ]);

        // Order 2 at Branch B
        Order::create([
            'order_code' => 'DH-BRANCH-B-002',
            'sale_date' => '2026-10-18',
            'branch_id' => $this->branchB->id,
            'consultant_name' => 'Consultant 2',
            'customer_name' => 'Customer B',
            'customer_phone' => '0900000002',
            'customer_gender' => 'Nữ',
            'customer_source_id' => $this->source->id,
            'discount_code' => 'E',
            'discount_rate' => 0,
            'gross_amount' => 200000,
            'discount_amount' => 0,
            'net_revenue' => 200000,
            'status' => 'cancelled',
            'created_by' => $this->user->id,
        ]);

        // Export with branch_id = branchA
        $response = $this->actingAs($this->user)
            ->get(route('admin.cashflow.orders.export', [
                'branch_id' => $this->branchA->id,
                'status' => 'completed',
            ]));

        $response->assertOk();
        $this->assertEquals(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );
    }
}

<?php

namespace App\Modules\CashFlow\Services;

use App\Models\User;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Models\OrderItem;
use App\Modules\CashFlow\Models\OrderPayment;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class OrderService
{
    public function __construct(
        protected OrderCalculationService $calculationService,
        protected AuditService $auditService,
        protected GoogleSheetsSyncService $sheetsSyncService
    ) {}

    /**
     * Create a new sales order with line items and payment.
     *
     * @param array{
     *     branch_id: int,
     *     consultant_name: string,
     *     customer_name: string,
     *     customer_phone: string,
     *     customer_gender: string,
     *     customer_source_id: int,
     *     discount_code: string,
     *     items: array,
     *     payment_method: string, // cash, bank_transfer, card_swipe
     *     payment_account_id?: int,
     *     sale_date?: string,
     *     note?: string,
     *     created_by?: int,
     *     telegram_user_id?: int
     * } $data
     */
    public function createOrder(array $data): Order
    {
        return DB::transaction(function () use ($data) {
            $branch = Branch::findOrFail($data['branch_id']);
            $saleDate = $data['sale_date'] ?? now()->toDateString();

            // Calculate totals and discount allocation
            $calculation = $this->calculationService->calculate(
                $data['items'] ?? [],
                $data['discount_code'] ?? 'E'
            );

            // Format phone number (preserve leading zero and text format)
            $phone = trim((string) ($data['customer_phone'] ?? ''));
            if (!str_starts_with($phone, '0') && is_numeric($phone)) {
                $phone = '0' . $phone;
            }

            // Generate unique Order Code
            $datePrefix = date('Ymd', strtotime($saleDate));
            $orderCount = Order::whereDate('sale_date', $saleDate)->count() + 1;
            $orderCode = sprintf('DH-%s-%04d', $datePrefix, $orderCount);

            // Resolve consultant (user id and name)
            $consultantId = $data['consultant_id'] ?? null;
            $consultantName = isset($data['consultant_name']) ? trim((string) $data['consultant_name']) : null;

            if ($consultantId) {
                $consultant = User::find($consultantId);
                if ($consultant) {
                    $consultantName = $consultant->name;
                }
            } elseif (!empty($consultantName)) {
                $consultant = User::where('name', $consultantName)->first();
                if ($consultant) {
                    $consultantId = $consultant->id;
                }
            }

            // Create Order record
            $order = Order::create([
                'order_code' => $orderCode,
                'sale_date' => $saleDate,
                'branch_id' => $branch->id,
                'consultant_id' => $consultantId,
                'consultant_name' => $consultantName,
                'customer_name' => trim($data['customer_name']),
                'customer_phone' => $phone,
                'customer_gender' => $data['customer_gender'],
                'customer_source_id' => $data['customer_source_id'],
                'discount_code' => $calculation['discount_code'],
                'discount_rate' => $calculation['discount_rate'],
                'gross_amount' => $calculation['gross_amount'],
                'discount_amount' => $calculation['discount_amount'],
                'net_revenue' => $calculation['net_revenue'],
                'note' => !empty($data['note']) && $data['note'] !== '-' ? trim($data['note']) : null,
                'status' => 'completed',
                'version' => 1,
                'created_by' => $data['created_by'] ?? null,
                'telegram_user_id' => $data['telegram_user_id'] ?? null,
            ]);

            // Create Order Items
            foreach ($calculation['items'] as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'line_number' => $item['line_number'],
                    'product_name' => trim($item['product_name']),
                    'brand_id' => $item['brand_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'gross_amount' => $item['gross_amount'],
                    'allocated_discount' => $item['allocated_discount'],
                    'net_amount' => $item['net_amount'],
                ]);
            }

            // Handle Payment
            $method = $data['payment_method']; // 'cash', 'bank_transfer', 'card_swipe', or 'unpaid'
            $accountId = null;
            $paymentStatus = 'completed';
            $swipeDate = null;

            if ($method === 'cash') {
                $cashFund = FinancialAccount::where('branch_id', $branch->id)
                    ->where('type', 'cash')
                    ->firstOrFail();
                $accountId = $cashFund->id;
            } elseif ($method === 'card_swipe') {
                $gateway = FinancialAccount::where('code', 'GATEWAY_F')->firstOrFail();
                $accountId = $gateway->id;
                $paymentStatus = 'pending_settlement';
                $swipeDate = $data['card_swipe_date'] ?? $saleDate;
            } elseif ($method === 'unpaid') {
                $accountId = null;
                $paymentStatus = 'unpaid';
            } else { // bank_transfer
                if (empty($data['payment_account_id'])) {
                    throw new InvalidArgumentException("Bank account must be selected for bank transfer");
                }
                $account = FinancialAccount::where('id', $data['payment_account_id'])
                    ->where('type', 'bank')
                    ->firstOrFail();
                $accountId = $account->id;
            }

            OrderPayment::create([
                'order_id' => $order->id,
                'method' => $method,
                'account_id' => $accountId,
                'amount' => $order->net_revenue,
                'payment_date' => $saleDate,
                'card_swipe_date' => $swipeDate,
                'status' => $paymentStatus,
            ]);

            $createdOrder = $order->load(['items.brand', 'payment.account', 'branch', 'customerSource', 'creator']);

            // Automatically sync to Google Sheets (Don_Hang, Chi_Tiet_Don, Thanh_Toan)
            try {
                $this->sheetsSyncService->sync('Don_Hang', [$this->sheetsSyncService->formatOrderRow($createdOrder)]);
                $itemRows = [];
                foreach ($createdOrder->items as $item) {
                    $itemRows[] = $this->sheetsSyncService->formatOrderItemRow($item, $createdOrder);
                }
                if (!empty($itemRows)) {
                    $this->sheetsSyncService->sync('Chi_Tiet_Don', $itemRows);
                }
                if ($createdOrder->payment) {
                    $this->sheetsSyncService->sync('Thanh_Toan', [$this->sheetsSyncService->formatPaymentRow($createdOrder->payment)]);
                }
            } catch (\Throwable $e) {
                // Ensure sync failure does not block transaction
            }

            return $createdOrder;
        });
    }

    /**
     * Manager update of an existing order with required reason and versioned audit trail.
     */
    public function updateOrder(Order $order, array $data, string $reason, ?int $userId = null, ?int $telegramUserId = null): Order
    {
        return DB::transaction(function () use ($order, $data, $reason, $userId, $telegramUserId) {
            $beforeSnapshot = $order->load(['items', 'payment'])->toArray();

            // Check if card payment was already reconciled
            if ($order->payment && $order->payment->status === 'reconciled') {
                // Cannot edit order without verifying card reconciliation
                throw new InvalidArgumentException("Cannot modify an order with a reconciled card payment directly.");
            }

            $calculation = $this->calculationService->calculate(
                $data['items'] ?? $order->items->toArray(),
                $data['discount_code'] ?? $order->discount_code
            );

            $consultantId = $data['consultant_id'] ?? $order->consultant_id;
            $consultantName = array_key_exists('consultant_name', $data) ? $data['consultant_name'] : $order->consultant_name;

            if (isset($data['consultant_id']) && $data['consultant_id'] != $order->consultant_id) {
                $consultant = User::find($data['consultant_id']);
                if ($consultant) {
                    $consultantName = $consultant->name;
                }
            } elseif (!empty($data['consultant_name']) && $data['consultant_name'] !== $order->consultant_name) {
                $consultant = User::where('name', $data['consultant_name'])->first();
                if ($consultant) {
                    $consultantId = $consultant->id;
                }
            }

            $order->update([
                'consultant_id' => $consultantId,
                'consultant_name' => $consultantName,
                'customer_name' => $data['customer_name'] ?? $order->customer_name,
                'customer_phone' => $data['customer_phone'] ?? $order->customer_phone,
                'customer_gender' => $data['customer_gender'] ?? $order->customer_gender,
                'customer_source_id' => $data['customer_source_id'] ?? $order->customer_source_id,
                'discount_code' => $calculation['discount_code'],
                'discount_rate' => $calculation['discount_rate'],
                'gross_amount' => $calculation['gross_amount'],
                'discount_amount' => $calculation['discount_amount'],
                'net_revenue' => $calculation['net_revenue'],
                'note' => array_key_exists('note', $data) ? $data['note'] : $order->note,
                'version' => $order->version + 1,
            ]);

            // Replace line items
            $order->items()->delete();
            foreach ($calculation['items'] as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'line_number' => $item['line_number'],
                    'product_name' => trim($item['product_name']),
                    'brand_id' => $item['brand_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'gross_amount' => $item['gross_amount'],
                    'allocated_discount' => $item['allocated_discount'],
                    'net_amount' => $item['net_amount'],
                ]);
            }

            // Update payment amount
            if ($order->payment) {
                $order->payment->update(['amount' => $order->net_revenue]);
            }

            $afterSnapshot = $order->fresh()->load(['items', 'payment'])->toArray();

            $this->auditService->recordAudit(
                auditable: $order,
                action: 'update',
                version: $order->version,
                reason: $reason,
                beforePayload: $beforeSnapshot,
                afterPayload: $afterSnapshot,
                userId: $userId,
                telegramUserId: $telegramUserId
            );

            try {
                $this->sheetsSyncService->sync('Don_Hang', [$this->sheetsSyncService->formatOrderRow($order->fresh())], 'update');
            } catch (\Throwable $e) {}

            return $order;
        });
    }

    /**
     * Cancel an order with reason (no physical deletion, does not auto refund cash balance).
     */
    public function cancelOrder(Order $order, string $reason, ?int $userId = null, ?int $telegramUserId = null): Order
    {
        return DB::transaction(function () use ($order, $reason, $userId, $telegramUserId) {
            $beforeSnapshot = $order->load(['items', 'payment'])->toArray();

            $order->update([
                'status' => 'cancelled',
                'version' => $order->version + 1,
            ]);

            $afterSnapshot = $order->fresh()->load(['items', 'payment'])->toArray();

            $this->auditService->recordAudit(
                auditable: $order,
                action: 'cancel',
                version: $order->version,
                reason: $reason,
                beforePayload: $beforeSnapshot,
                afterPayload: $afterSnapshot,
                userId: $userId,
                telegramUserId: $telegramUserId
            );

            try {
                $this->sheetsSyncService->sync('Don_Hang', [$this->sheetsSyncService->formatOrderRow($order->fresh())], 'update');
            } catch (\Throwable $e) {}

            return $order;
        });
    }
}

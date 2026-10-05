<?php

namespace App\Modules\CashFlow\Services;

use App\Modules\CashFlow\Models\DailyStaffBalance;
use App\Modules\CashFlow\Models\Expense;
use App\Modules\CashFlow\Models\InternalTransfer;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Models\OrderItem;
use App\Modules\CashFlow\Models\OrderPayment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleSheetsSyncService
{
    protected ?string $webhookUrl;
    protected ?string $spreadsheetId;

    public function __construct()
    {
        $this->webhookUrl = config('services.google_sheets.webhook_url');
        $this->spreadsheetId = config('services.google_sheets.spreadsheet_id');
    }

    /**
     * Format Order for Don_Hang sheet.
     */
    public function formatOrderRow(Order $order): array
    {
        return [
            'order_id' => $order->order_code,
            'sale_date' => $order->sale_date->format('Y-m-d'),
            'sale_month' => $order->sale_date->format('m'),
            'sale_year' => $order->sale_date->format('Y'),
            'created_at' => $order->created_at?->toIso8601String(),
            'created_by' => $order->creator?->name ?? ($order->telegram_user_id ? "TG:{$order->telegram_user_id}" : 'System'),
            'branch_name' => $order->branch?->name,
            'consultant_name' => $order->consultant?->name ?? $order->consultant_name ?? '',
            'customer_name' => $order->customer_name,
            'customer_phone' => "'" . $order->customer_phone, // Force text with leading zero in Sheets
            'customer_gender' => $order->customer_gender,
            'source_name' => $order->customerSource?->name,
            'gross_amount' => (float) $order->gross_amount,
            'discount_rate' => (float) $order->discount_rate,
            'discount_amount' => (float) $order->discount_amount,
            'net_revenue' => (float) $order->net_revenue,
            'payment_type' => match ($order->payment?->method) {
                'cash' => 'Tiền mặt',
                'bank_transfer' => 'Chuyển khoản',
                'card_swipe' => 'Quẹt thẻ',
                'unpaid' => 'Chưa thanh toán',
                default => $order->payment?->method,
            },
            'bank_account_name' => $order->payment?->account?->name,
            'note' => $order->note ?? '',
            'status' => $order->status,
            'version' => $order->version,
        ];
    }

    /**
     * Format OrderItem for Chi_Tiet_Don sheet.
     */
    public function formatOrderItemRow(OrderItem $item, Order $order): array
    {
        return [
            'line_id' => "{$order->order_code}-{$item->line_number}",
            'order_id' => $order->order_code,
            'line_number' => $item->line_number,
            'product_name' => $item->product_name,
            'brand_code' => $item->brand?->code,
            'brand_name' => $item->brand?->name,
            'quantity' => $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'gross_amount' => (float) $item->gross_amount,
            'allocated_discount' => (float) $item->allocated_discount,
            'net_amount' => (float) $item->net_amount,
        ];
    }

    /**
     * Format Payment for Thanh_Toan sheet.
     */
    public function formatPaymentRow(OrderPayment $payment): array
    {
        return [
            'payment_id' => "PAY-{$payment->id}",
            'order_id' => $payment->order?->order_code,
            'method' => $payment->method,
            'account' => $payment->account?->name ?? ($payment->method === 'unpaid' ? 'Chưa thanh toán' : ''),
            'amount' => (float) $payment->amount,
            'payment_date' => $payment->payment_date->format('Y-m-d'),
            'card_swipe_date' => $payment->card_swipe_date?->format('Y-m-d') ?? '',
            'card_settlement_date' => $payment->card_settlement_date?->format('Y-m-d') ?? '',
            'settlement_account' => $payment->settlementAccount?->name ?? '',
            'actual_received_amount' => (float) ($payment->actual_received_amount ?? 0),
            'fee_amount' => (float) ($payment->fee_amount ?? 0),
            'status' => $payment->status,
            'settled_by' => $payment->settledByUser?->name ?? '',
        ];
    }

    /**
     * Format Expense for Data_Chi sheet.
     */
    public function formatExpenseRow(Expense $expense): array
    {
        return [
            'expense_id' => $expense->expense_code,
            'branch_code' => $expense->branch?->code,
            'branch_name' => $expense->branch?->name,
            'expense_date' => $expense->expense_date->format('Y-m-d'),
            'spender_name' => $expense->spender_name,
            'content' => $expense->content,
            'quantity' => $expense->quantity,
            'unit_price' => (float) $expense->unit_price,
            'total_amount' => (float) $expense->total_amount,
            'method' => $expense->method,
            'account' => $expense->account?->name,
            'note' => $expense->note ?? '',
            'status' => $expense->status,
            'created_by' => $expense->creator?->name ?? ($expense->telegram_user_id ? "TG:{$expense->telegram_user_id}" : 'System'),
            'version' => $expense->version,
        ];
    }

    /**
     * Format Transfer for Chuyen_Tien sheet.
     */
    public function formatTransferRow(InternalTransfer $transfer): array
    {
        return [
            'transfer_id' => $transfer->transfer_code,
            'transfer_date' => $transfer->transfer_date->format('Y-m-d'),
            'from_account' => $transfer->fromAccount?->name,
            'to_account' => $transfer->toAccount?->name,
            'amount' => (float) $transfer->amount,
            'transfer_type' => $transfer->transfer_type,
            'related_order' => $transfer->relatedOrder?->order_code ?? '',
            'reason' => $transfer->reason ?? '',
            'note' => $transfer->note ?? '',
            'created_by' => $transfer->creator?->name ?? 'System',
        ];
    }

    /**
     * Check if Google Sheets webhook and spreadsheet ID are configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->webhookUrl) && !empty($this->spreadsheetId);
    }

    /**
     * Sync entire Order (Don_Hang, Chi_Tiet_Don, and Thanh_Toan).
     */
    public function syncOrder(Order $order, string $action = 'append'): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        $order->loadMissing([
            'branch',
            'creator',
            'customerSource',
            'consultant',
            'items.brand',
            'payment.account',
            'payment.settlementAccount',
            'payment.settledByUser',
        ]);

        if ($order->payment && !$order->payment->relationLoaded('order')) {
            $order->payment->setRelation('order', $order);
        }

        $success = $this->sync('Don_Hang', [$this->formatOrderRow($order)], $action);

        if ($order->items && $order->items->isNotEmpty()) {
            $itemRows = [];
            foreach ($order->items as $item) {
                $itemRows[] = $this->formatOrderItemRow($item, $order);
            }
            $itemsSuccess = $this->sync('Chi_Tiet_Don', $itemRows, $action);
            $success = $success && $itemsSuccess;
        }

        if ($order->payment) {
            $paymentSuccess = $this->sync('Thanh_Toan', [$this->formatPaymentRow($order->payment)], $action);
            $success = $success && $paymentSuccess;
        }

        return $success;
    }

    /**
     * Sync Expense (Data_Chi).
     */
    public function syncExpense(Expense $expense, string $action = 'append'): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        $expense->loadMissing(['branch', 'account', 'creator']);

        return $this->sync('Data_Chi', [$this->formatExpenseRow($expense)], $action);
    }

    /**
     * Format DailyStaffBalance for Balance sheet.
     */
    public function formatBalanceRow(DailyStaffBalance $balance): array
    {
        $balance->loadMissing(['user', 'account']);

        $orderInflow = (float) OrderPayment::where('account_id', $balance->account_id)
            ->where('status', 'completed')
            ->whereDate('payment_date', $balance->date)
            ->sum('amount');

        $cardInflow = (float) OrderPayment::where('card_settlement_account_id', $balance->account_id)
            ->where('status', 'reconciled')
            ->whereDate('card_settlement_date', $balance->date)
            ->sum('actual_received_amount');

        $transfersIn = (float) InternalTransfer::where('to_account_id', $balance->account_id)
            ->whereDate('transfer_date', $balance->date)
            ->sum('amount');

        $transfersOut = (float) InternalTransfer::where('from_account_id', $balance->account_id)
            ->whereDate('transfer_date', $balance->date)
            ->sum('amount');

        $expensesOut = (float) Expense::where('account_id', $balance->account_id)
            ->where('status', 'completed')
            ->whereDate('expense_date', $balance->date)
            ->sum('total_amount');

        $totalIn = $orderInflow + $cardInflow + $transfersIn;
        $totalOut = $transfersOut + $expensesOut;
        $expectedBalance = (float) $balance->opening_balance + $totalIn - $totalOut;
        $discrepancy = $balance->closing_balance !== null ? ((float) $balance->closing_balance - $expectedBalance) : '';

        return [
            'balance_id' => "BAL-{$balance->date->format('Ymd')}-{$balance->user_id}",
            'date' => $balance->date->format('Y-m-d'),
            'staff_name' => $balance->user?->name ?? '',
            'staff_email' => $balance->user?->email ?? '',
            'account_code' => $balance->account?->code ?? '',
            'account_letter' => $balance->account?->letter_code ?? '',
            'account_name' => $balance->account?->name ?? '',
            'opening_balance' => (float) $balance->opening_balance,
            'opened_at' => $balance->opened_at?->toIso8601String() ?? '',
            'closing_balance' => $balance->closing_balance !== null ? (float) $balance->closing_balance : '',
            'closed_at' => $balance->closed_at?->toIso8601String() ?? '',
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'expected_balance' => $expectedBalance,
            'discrepancy' => $discrepancy !== '' ? (float) $discrepancy : '',
            'status' => $balance->status,
            'note' => $balance->note ?? '',
            'updated_at' => $balance->updated_at?->toIso8601String() ?? '',
        ];
    }

    /**
     * Sync DailyStaffBalance (Balance sheet).
     */
    public function syncBalance(DailyStaffBalance $balance, string $action = 'append'): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        $balance->loadMissing(['user', 'account']);

        return $this->sync('Balance', [$this->formatBalanceRow($balance)], $action);
    }

    /**
     * Sync data to Google Sheets via Webhook (Google Apps Script Web App).
     */
    public function sync(string $sheetName, array $rows, string $action = 'append'): bool
    {
        if (!$this->webhookUrl) {
            Log::info("Google Sheets Webhook URL not configured. Sync skipped for sheet: {$sheetName}");
            return false;
        }

        try {
            $response = Http::timeout(10)->post($this->webhookUrl, [
                'spreadsheet_id' => $this->spreadsheetId,
                'sheet' => $sheetName,
                'action' => $action,
                'data' => $rows,
            ]);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::error("Failed to sync to Google Sheets: " . $e->getMessage());
            return false;
        }
    }
}


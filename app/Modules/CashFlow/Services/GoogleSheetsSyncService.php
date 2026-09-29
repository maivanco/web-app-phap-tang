<?php

namespace App\Modules\CashFlow\Services;

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
        $this->webhookUrl = config('services.google_sheets.webhook_url', env('GOOGLE_SHEETS_WEBHOOK_URL'));
        $this->spreadsheetId = config('services.google_sheets.spreadsheet_id', env('GOOGLE_SHEETS_SPREADSHEET_ID'));
    }

    /**
     * Format Order for Don_Hang sheet.
     */
    public function formatOrderRow(Order $order): array
    {
        return [
            'order_id' => $order->order_code,
            'sale_date' => $order->sale_date->format('Y-m-d'),
            'created_at' => $order->created_at?->toIso8601String(),
            'created_by' => $order->creator?->name ?? ($order->telegram_user_id ? "TG:{$order->telegram_user_id}" : 'System'),
            'branch_code' => $order->branch?->code,
            'branch_name' => $order->branch?->name,
            'consultant_name' => $order->consultant_name,
            'customer_name' => $order->customer_name,
            'customer_phone' => "'" . $order->customer_phone, // Force text with leading zero in Sheets
            'customer_gender' => $order->customer_gender,
            'source_code' => $order->customerSource?->code,
            'source_name' => $order->customerSource?->name,
            'gross_amount' => (float) $order->gross_amount,
            'discount_rate' => (float) $order->discount_rate,
            'discount_amount' => (float) $order->discount_amount,
            'net_revenue' => (float) $order->net_revenue,
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
            'account' => $payment->account?->name,
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
     * Sync data to Google Sheets via Webhook (Google Apps Script Web App).
     */
    public function sync(string $sheetName, array $rows, string $action = 'append'): bool
    {
        if (!$this->webhookUrl) {
            Log::info("Google Sheets Webhook URL not configured. Sync skipped for sheet: {$sheetName}");
            return true;
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

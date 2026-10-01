<?php

namespace App\Console\Commands;

use App\Modules\CashFlow\Models\Expense;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Services\GoogleSheetsSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class GoogleSheetsTestCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'google-sheets:test
                            {--sheet=Don_Hang : Target sheet name (Don_Hang or Data_Chi)}
                            {--order= : Specific order code to sync}
                            {--expense= : Specific expense code to sync}
                            {--latest : Sync the latest real order or expense from database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test Google Sheets synchronization by sending sample data or real records';

    /**
     * Execute the console command.
     */
    public function handle(GoogleSheetsSyncService $syncService): int
    {
        $webhookUrl = config('services.google_sheets.webhook_url');
        $spreadsheetId = config('services.google_sheets.spreadsheet_id');

        $this->info("=== Google Sheets Sync Test ===");
        $this->line("Spreadsheet ID : " . ($spreadsheetId ?: '<not set>'));
        $this->line("Webhook URL    : " . ($webhookUrl ? $this->maskUrl($webhookUrl) : '<not set>'));
        $this->newLine();

        if (empty($webhookUrl) || empty($spreadsheetId)) {
            $this->error("❌ Google Sheets is not configured properly in .env!");
            $this->warn("Please ensure GOOGLE_SHEETS_WEBHOOK_URL and GOOGLE_SHEETS_SPREADSHEET_ID are set.");
            return 1;
        }

        // Mode 1: Sync specific or latest real Order
        $orderCode = $this->option('order');
        if ($orderCode || ($this->option('latest') && $this->option('sheet') === 'Don_Hang')) {
            $order = $orderCode
                ? Order::where('order_code', $orderCode)->first()
                : Order::latest('id')->first();

            if (!$order) {
                $this->error("❌ No order found" . ($orderCode ? " with code: {$orderCode}" : " in database."));
                return 1;
            }

            $this->info("Syncing real order [{$order->order_code}] (Total: {$order->gross_amount})...");
            $success = $syncService->syncOrder($order);

            if ($success) {
                $this->info("✅ Order {$order->order_code} successfully synced to Google Sheets!");
                return 0;
            }

            $this->error("❌ Failed to sync order {$order->order_code}. Check storage/logs/laravel.log for details.");
            return 1;
        }

        // Mode 2: Sync specific or latest real Expense
        $expenseCode = $this->option('expense');
        if ($expenseCode || ($this->option('latest') && $this->option('sheet') === 'Data_Chi')) {
            $expense = $expenseCode
                ? Expense::where('expense_code', $expenseCode)->first()
                : Expense::latest('id')->first();

            if (!$expense) {
                $this->error("❌ No expense found" . ($expenseCode ? " with code: {$expenseCode}" : " in database."));
                return 1;
            }

            $this->info("Syncing real expense [{$expense->expense_code}] (Amount: {$expense->total_amount})...");
            $success = $syncService->syncExpense($expense);

            if ($success) {
                $this->info("✅ Expense {$expense->expense_code} successfully synced to Google Sheets!");
                return 0;
            }

            $this->error("❌ Failed to sync expense {$expense->expense_code}. Check storage/logs/laravel.log for details.");
            return 1;
        }

        // Mode 3: Send Sample Dummy Data
        $sheet = $this->option('sheet');
        $sampleRows = $this->generateSampleRows($sheet);

        $this->info("Sending sample test row to sheet [{$sheet}]...");
        $this->table(
            array_keys($sampleRows[0]),
            array_map(fn($row) => array_values($row), $sampleRows)
        );

        $startTime = microtime(true);
        try {
            $response = Http::timeout(15)->post($webhookUrl, [
                'spreadsheet_id' => $spreadsheetId,
                'sheet' => $sheet,
                'action' => 'append',
                'data' => $sampleRows,
            ]);

            $elapsedMs = round((microtime(true) - $startTime) * 1000);

            $this->line("Response status : {$response->status()} ({$elapsedMs}ms)");
            $this->line("Response body   : " . ($response->body() ?: '<empty>'));

            if ($response->successful()) {
                $this->info("✅ Sample data was accepted by Google Sheets Webhook!");
                return 0;
            }

            $this->error("❌ Webhook returned HTTP status {$response->status()}");
            return 1;
        } catch (\Throwable $e) {
            $this->error("❌ Exception during sync request: " . $e->getMessage());
            return 1;
        }
    }

    /**
     * Generate sample dummy rows for test.
     */
    protected function generateSampleRows(string $sheet): array
    {
        $timestamp = date('Ymd-His');

        if ($sheet === 'Data_Chi') {
            return [[
                'expense_id' => "EXP-TEST-{$timestamp}",
                'branch_code' => 'CLI',
                'branch_name' => 'Chi nhánh Test CLI',
                'expense_date' => now()->format('Y-m-d'),
                'spender_name' => 'CLI Tester',
                'content' => 'Test chi phí từ CLI',
                'quantity' => 1,
                'unit_price' => 50000.0,
                'total_amount' => 50000.0,
                'method' => 'cash',
                'account' => 'Tiền mặt',
                'note' => 'Test sample row generated by CLI test command',
                'status' => 'completed',
                'created_by' => 'CLI Tester',
                'version' => 1,
            ]];
        }

        return [[
            'order_id' => "CLI-TEST-{$timestamp}",
            'sale_date' => now()->format('Y-m-d'),
            'created_at' => now()->toIso8601String(),
            'created_by' => 'CLI Tester',
            'branch_code' => 'CLI',
            'branch_name' => 'Chi nhánh Test CLI',
            'consultant_name' => 'CLI Bot',
            'customer_name' => 'Khách Hàng Test CLI',
            'customer_phone' => "'0909000000",
            'customer_gender' => 'other',
            'source_code' => 'CLI',
            'source_name' => 'CLI Test',
            'gross_amount' => 100000.0,
            'discount_rate' => 0.0,
            'discount_amount' => 0.0,
            'net_revenue' => 100000.0,
            'note' => 'Test sample row generated by CLI test command',
            'status' => 'completed',
            'version' => 1,
        ]];
    }

    /**
     * Mask Webhook URL for console output.
     */
    protected function maskUrl(string $url): string
    {
        if (strlen($url) <= 30) {
            return $url;
        }
        return substr($url, 0, 25) . '...' . substr($url, -10);
    }
}

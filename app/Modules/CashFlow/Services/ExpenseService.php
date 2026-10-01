<?php

namespace App\Modules\CashFlow\Services;

use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\Expense;
use App\Modules\CashFlow\Models\FinancialAccount;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ExpenseService
{
    public function __construct(
        protected AuditService $auditService,
        protected GoogleSheetsSyncService $sheetsSyncService
    ) {}

    /**
     * Record a new expense.
     *
     * @param array{
     *     branch_id: int,
     *     spender_name: string,
     *     content: string,
     *     quantity?: int,
     *     unit_price: float,
     *     payment_method: string, // cash, bank_transfer
     *     account_id?: int,
     *     expense_date?: string,
     *     note?: string,
     *     created_by?: int,
     *     telegram_user_id?: int
     * } $data
     */
    public function createExpense(array $data): Expense
    {
        return DB::transaction(function () use ($data) {
            $branch = Branch::findOrFail($data['branch_id']);
            $expenseDate = $data['expense_date'] ?? now()->toDateString();
            $quantity = (int) ($data['quantity'] ?? 1);
            $unitPrice = (float) ($data['unit_price'] ?? 0);

            if ($quantity <= 0) {
                throw new InvalidArgumentException("Quantity must be greater than 0");
            }
            if ($unitPrice < 0) {
                throw new InvalidArgumentException("Price cannot be negative");
            }

            $totalAmount = (float) round($quantity * $unitPrice);

            // Handle payment account
            $method = $data['payment_method']; // 'cash' or 'bank_transfer'
            $accountId = null;

            if ($method === 'cash') {
                $cashFund = FinancialAccount::where('branch_id', $branch->id)
                    ->where('type', 'cash')
                    ->firstOrFail();
                $accountId = $cashFund->id;
            } else {
                if (empty($data['account_id'])) {
                    throw new InvalidArgumentException("Account must be selected for bank transfer");
                }

                $account = FinancialAccount::findOrFail($data['account_id']);

                // Strict validation: Option F (Card Gateway) is NOT permitted for expenses (Test T07)
                if ($account->code === 'GATEWAY_F' || $account->letter_code === 'F' || $account->type === 'card_gateway') {
                    throw new InvalidArgumentException("Account F (Card Gateway) cannot be used for expenses.");
                }

                $accountId = $account->id;
            }

            // Generate unique Expense Code
            $datePrefix = date('Ymd', strtotime($expenseDate));
            $expenseCount = Expense::whereDate('expense_date', $expenseDate)->count() + 1;
            $expenseCode = sprintf('CT-%s-%04d', $datePrefix, $expenseCount);

            $note = !empty($data['note']) && $data['note'] !== '-' ? trim($data['note']) : null;

            $expense = Expense::create([
                'expense_code' => $expenseCode,
                'expense_date' => $expenseDate,
                'branch_id' => $branch->id,
                'spender_name' => trim($data['spender_name']),
                'content' => trim($data['content']),
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_amount' => $totalAmount,
                'method' => $method,
                'account_id' => $accountId,
                'note' => $note,
                'status' => 'completed',
                'version' => 1,
                'created_by' => $data['created_by'] ?? null,
                'telegram_user_id' => $data['telegram_user_id'] ?? null,
            ]);

            try {
                $this->sheetsSyncService->syncExpense($expense);
            } catch (\Throwable $e) {}

            return $expense;
        });
    }

    /**
     * Manager update of an existing expense with required reason.
     */
    public function updateExpense(Expense $expense, array $data, string $reason, ?int $userId = null, ?int $telegramUserId = null): Expense
    {
        return DB::transaction(function () use ($expense, $data, $reason, $userId, $telegramUserId) {
            $beforeSnapshot = $expense->toArray();

            $quantity = (int) ($data['quantity'] ?? $expense->quantity);
            $unitPrice = (float) ($data['unit_price'] ?? $expense->unit_price);

            if ($quantity <= 0) {
                throw new InvalidArgumentException("Quantity must be greater than 0");
            }
            if ($unitPrice < 0) {
                throw new InvalidArgumentException("Price cannot be negative");
            }

            $totalAmount = (float) round($quantity * $unitPrice);

            $accountId = $expense->account_id;
            if (!empty($data['account_id'])) {
                $account = FinancialAccount::findOrFail($data['account_id']);
                if ($account->code === 'GATEWAY_F' || $account->letter_code === 'F' || $account->type === 'card_gateway') {
                    throw new InvalidArgumentException("Account F (Card Gateway) cannot be used for expenses.");
                }
                $accountId = $account->id;
            }

            $expense->update([
                'spender_name' => $data['spender_name'] ?? $expense->spender_name,
                'content' => $data['content'] ?? $expense->content,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_amount' => $totalAmount,
                'account_id' => $accountId,
                'note' => array_key_exists('note', $data) ? $data['note'] : $expense->note,
                'version' => $expense->version + 1,
            ]);

            $afterSnapshot = $expense->fresh()->toArray();

            $this->auditService->recordAudit(
                auditable: $expense,
                action: 'update',
                version: $expense->version,
                reason: $reason,
                beforePayload: $beforeSnapshot,
                afterPayload: $afterSnapshot,
                userId: $userId,
                telegramUserId: $telegramUserId
            );

            return $expense;
        });
    }

    /**
     * Cancel an expense with reason.
     */
    public function cancelExpense(Expense $expense, string $reason, ?int $userId = null, ?int $telegramUserId = null): Expense
    {
        return DB::transaction(function () use ($expense, $reason, $userId, $telegramUserId) {
            $beforeSnapshot = $expense->toArray();

            $expense->update([
                'status' => 'cancelled',
                'version' => $expense->version + 1,
            ]);

            $afterSnapshot = $expense->fresh()->toArray();

            $this->auditService->recordAudit(
                auditable: $expense,
                action: 'cancel',
                version: $expense->version,
                reason: $reason,
                beforePayload: $beforeSnapshot,
                afterPayload: $afterSnapshot,
                userId: $userId,
                telegramUserId: $telegramUserId
            );

            return $expense;
        });
    }
}

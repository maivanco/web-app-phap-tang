<?php

namespace App\Modules\CashFlow\Services;

use App\Modules\CashFlow\Models\Expense;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\InitialBalance;
use App\Modules\CashFlow\Models\InternalTransfer;
use App\Modules\CashFlow\Models\OrderPayment;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class TreasuryService
{
    /**
     * Perform an internal transfer between accounts/funds.
     */
    public function createTransfer(array $data): InternalTransfer
    {
        return DB::transaction(function () use ($data) {
            $fromAccountId = (int) $data['from_account_id'];
            $toAccountId = (int) $data['to_account_id'];
            $amount = (float) ($data['amount'] ?? 0);

            if ($fromAccountId === $toAccountId) {
                throw new InvalidArgumentException("Source and destination accounts must be different.");
            }
            if ($amount <= 0) {
                throw new InvalidArgumentException("Transfer amount must be greater than 0.");
            }

            $fromAccount = FinancialAccount::findOrFail($fromAccountId);
            $toAccount = FinancialAccount::findOrFail($toAccountId);

            if ($fromAccount->type === 'card_gateway' || $toAccount->type === 'card_gateway') {
                throw new InvalidArgumentException("Cannot transfer directly to/from card gateway F.");
            }

            $date = $data['transfer_date'] ?? now()->toDateString();
            $datePrefix = date('Ymd', strtotime($date));
            $count = InternalTransfer::whereDate('transfer_date', $date)->count() + 1;
            $transferCode = sprintf('CKNB-%s-%04d', $datePrefix, $count);

            return InternalTransfer::create([
                'transfer_code' => $transferCode,
                'transfer_date' => $date,
                'from_account_id' => $fromAccount->id,
                'to_account_id' => $toAccount->id,
                'amount' => $amount,
                'transfer_type' => $data['transfer_type'] ?? 'internal_transfer',
                'related_order_id' => $data['related_order_id'] ?? null,
                'reason' => $data['reason'] ?? null,
                'note' => $data['note'] ?? null,
                'created_by' => $data['created_by'] ?? null,
            ]);
        });
    }

    /**
     * Calculate current balance for a single financial account.
     */
    public function getAccountBalance(FinancialAccount $account, ?string $asOfDate = null): array
    {
        $asOf = $asOfDate ? Carbon::parse($asOfDate)->endOfDay() : now()->endOfDay();

        // 1. Initial Balance with latest effective date <= asOf
        $initial = InitialBalance::where('account_id', $account->id)
            ->whereDate('effective_date', '<=', $asOf)
            ->orderByDesc('effective_date')
            ->first();

        $initialAmount = $initial ? (float) $initial->initial_amount : 0.0;
        $effectiveDate = $initial ? Carbon::parse($initial->effective_date)->startOfDay() : null;

        // If card gateway F: doesn't hold real bank balance
        if ($account->type === 'card_gateway') {
            // Count total pending amount
            $pendingAmount = (float) OrderPayment::where('account_id', $account->id)
                ->where('status', 'pending_settlement')
                ->whereDate('payment_date', '<=', $asOf)
                ->sum('amount');

            return [
                'account' => $account,
                'initial_amount' => 0.0,
                'effective_date' => null,
                'total_in' => 0.0,
                'total_out' => 0.0,
                'current_balance' => 0.0,
                'pending_card_amount' => $pendingAmount,
            ];
        }

        // 2. Real Money In:
        // A. Direct Cash / Bank order payments (completed)
        $directPaymentsQuery = OrderPayment::where('account_id', $account->id)
            ->where('status', 'completed')
            ->whereDate('payment_date', '<=', $asOf);

        if ($effectiveDate) {
            $directPaymentsQuery->whereDate('payment_date', '>=', $effectiveDate);
        }
        $directPayments = (float) $directPaymentsQuery->sum('amount');

        // B. Reconciled card settlements where this account is the settlement destination
        $cardSettlementsQuery = OrderPayment::where('card_settlement_account_id', $account->id)
            ->where('status', 'reconciled')
            ->whereDate('card_settlement_date', '<=', $asOf);

        if ($effectiveDate) {
            $cardSettlementsQuery->whereDate('card_settlement_date', '>=', $effectiveDate);
        }
        $cardSettlements = (float) $cardSettlementsQuery->sum('actual_received_amount');

        // C. Internal transfers in
        $transfersInQuery = InternalTransfer::where('to_account_id', $account->id)
            ->whereDate('transfer_date', '<=', $asOf);

        if ($effectiveDate) {
            $transfersInQuery->whereDate('transfer_date', '>=', $effectiveDate);
        }
        $transfersIn = (float) $transfersInQuery->sum('amount');

        $totalIn = $directPayments + $cardSettlements + $transfersIn;

        // 3. Real Money Out:
        // A. Expenses
        $expensesQuery = Expense::where('account_id', $account->id)
            ->where('status', 'completed')
            ->whereDate('expense_date', '<=', $asOf);

        if ($effectiveDate) {
            $expensesQuery->whereDate('expense_date', '>=', $effectiveDate);
        }
        $expensesOut = (float) $expensesQuery->sum('total_amount');

        // B. Internal transfers out
        $transfersOutQuery = InternalTransfer::where('from_account_id', $account->id)
            ->whereDate('transfer_date', '<=', $asOf);

        if ($effectiveDate) {
            $transfersOutQuery->whereDate('transfer_date', '>=', $effectiveDate);
        }
        $transfersOut = (float) $transfersOutQuery->sum('amount');

        $totalOut = $expensesOut + $transfersOut;

        $currentBalance = $initialAmount + $totalIn - $totalOut;

        return [
            'account' => $account,
            'initial_amount' => $initialAmount,
            'effective_date' => $effectiveDate?->toDateString(),
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'current_balance' => $currentBalance,
        ];
    }

    /**
     * Get balances for all financial accounts.
     */
    public function getAllBalances(?string $asOfDate = null): Collection
    {
        $accounts = FinancialAccount::with('branch')->where('status', 'active')->get();

        return $accounts->map(fn (FinancialAccount $acc) => $this->getAccountBalance($acc, $asOfDate));
    }
}

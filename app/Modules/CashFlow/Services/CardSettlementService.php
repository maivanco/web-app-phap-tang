<?php

namespace App\Modules\CashFlow\Services;

use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\OrderPayment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CardSettlementService
{
    /**
     * Reconcile / settle a pending card swipe payment.
     *
     * @param OrderPayment $payment
     * @param array{
     *     settlement_date: string,
     *     target_account_id: int,
     *     actual_received_amount: float,
     *     fee_amount: float,
     *     settled_by?: int
     * } $data
     */
    public function settleCardPayment(OrderPayment $payment, array $data): OrderPayment
    {
        return DB::transaction(function () use ($payment, $data) {
            // Must be a pending settlement payment
            if ($payment->status !== 'pending_settlement') {
                throw new InvalidArgumentException("This payment is not pending card settlement (current status: {$payment->status}).");
            }

            $settlementDate = Carbon::parse($data['settlement_date'])->startOfDay();
            $swipeDate = Carbon::parse($payment->card_swipe_date ?? $payment->payment_date)->startOfDay();

            // Date validation: settlement_date cannot be earlier than card_swipe_date
            if ($settlementDate->lt($swipeDate)) {
                throw new InvalidArgumentException("Card settlement date cannot be earlier than card swipe date ({$swipeDate->toDateString()}).");
            }

            // Target account validation: must be a real bank account, cannot be F (card gateway) or cash
            $targetAccount = FinancialAccount::findOrFail($data['target_account_id']);
            if ($targetAccount->type !== 'bank' || $targetAccount->code === 'GATEWAY_F' || $targetAccount->letter_code === 'F') {
                throw new InvalidArgumentException("Destination account must be an active bank account (A-G, excluding F).");
            }

            $actualReceived = (float) ($data['actual_received_amount'] ?? 0);
            $fee = (float) ($data['fee_amount'] ?? 0);

            if ($actualReceived < 0) {
                throw new InvalidArgumentException("Actual received amount cannot be negative.");
            }
            if ($fee < 0) {
                throw new InvalidArgumentException("Card processing fee cannot be negative.");
            }

            // Strict reconciliation rule: actual_received_amount + fee_amount MUST equal payment amount (swipe amount)
            $totalSettled = (float) round($actualReceived + $fee);
            $expectedAmount = (float) round($payment->amount);

            if ($totalSettled !== $expectedAmount) {
                throw new InvalidArgumentException(
                    "Reconciliation mismatch: Actual amount ({$actualReceived}) + Fee ({$fee}) = {$totalSettled}, which does not match card swipe amount ({$expectedAmount}). Transaction kept as pending."
                );
            }

            // Update payment record to reconciled / completed
            $payment->update([
                'status' => 'reconciled',
                'card_settlement_date' => $settlementDate->toDateString(),
                'card_settlement_account_id' => $targetAccount->id,
                'actual_received_amount' => $actualReceived,
                'fee_amount' => $fee,
                'settled_by' => $data['settled_by'] ?? null,
            ]);

            return $payment->fresh(['settlementAccount', 'order']);
        });
    }
}

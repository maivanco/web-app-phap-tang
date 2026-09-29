<?php

namespace App\Modules\CashFlow\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\OrderPayment;
use App\Modules\CashFlow\Services\CardSettlementService;
use App\Modules\CashFlow\Services\GoogleSheetsSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CardSettlementController extends Controller
{
    public function __construct(
        protected CardSettlementService $settlementService,
        protected GoogleSheetsSyncService $sheetsSyncService
    ) {}

    public function index(Request $request): Response
    {
        // Pending card transactions
        $pendingPayments = OrderPayment::where('method', 'card_swipe')
            ->where('status', 'pending_settlement')
            ->with(['order.branch', 'account'])
            ->orderBy('payment_date')
            ->get();

        // Recently settled card transactions
        $settledPayments = OrderPayment::where('method', 'card_swipe')
            ->where('status', 'reconciled')
            ->with(['order.branch', 'settlementAccount', 'settledByUser'])
            ->orderByDesc('card_settlement_date')
            ->paginate(15);

        // Active bank accounts (A-G, excluding F)
        $bankAccounts = FinancialAccount::where('status', 'active')
            ->where('type', 'bank')
            ->orderBy('letter_code')
            ->get();

        return Inertia::render('Admin/Modules/CashFlow/CardSettlements/Index', [
            'pending_payments' => $pendingPayments,
            'settled_payments' => $settledPayments,
            'bank_accounts' => $bankAccounts,
        ]);
    }

    public function settle(Request $request, OrderPayment $payment): RedirectResponse
    {
        // Only managers can reconcile cards
        if (!$request->user()->isManager()) {
            abort(403, 'Chỉ Quản lý mới có quyền đối soát và cập nhật tiền thẻ về.');
        }

        $validated = $request->validate([
            'settlement_date' => 'required|date',
            'target_account_id' => 'required|exists:financial_accounts,id',
            'actual_received_amount' => 'required|numeric|min:0',
            'fee_amount' => 'required|numeric|min:0',
        ]);

        $validated['settled_by'] = $request->user()->id;

        $settledPayment = $this->settlementService->settleCardPayment($payment, $validated);

        try {
            $this->sheetsSyncService->sync('Thanh_Toan', [$this->sheetsSyncService->formatPaymentRow($settledPayment)], 'update');
        } catch (\Throwable $e) {}

        return redirect()->route('admin.cashflow.card-settlements.index')
            ->with('success', "Đã đối soát thành công giao dịch quẹt thẻ cho đơn hàng {$payment->order?->order_code}!");
    }
}

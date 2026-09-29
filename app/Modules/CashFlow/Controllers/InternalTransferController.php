<?php

namespace App\Modules\CashFlow\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\InternalTransfer;
use App\Modules\CashFlow\Services\GoogleSheetsSyncService;
use App\Modules\CashFlow\Services\TreasuryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InternalTransferController extends Controller
{
    public function __construct(
        protected TreasuryService $treasuryService,
        protected GoogleSheetsSyncService $sheetsSyncService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', InternalTransfer::class);

        $transfers = InternalTransfer::with(['fromAccount', 'toAccount', 'relatedOrder', 'creator'])
            ->orderByDesc('id')
            ->paginate(15);

        $accounts = FinancialAccount::where('status', 'active')
            ->whereIn('type', ['cash', 'bank'])
            ->with('branch')
            ->orderBy('type')
            ->orderBy('letter_code')
            ->get();

        return Inertia::render('Admin/Modules/CashFlow/Transfers/Index', [
            'transfers' => $transfers,
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', InternalTransfer::class);

        $validated = $request->validate([
            'transfer_date' => 'required|date',
            'from_account_id' => 'required|exists:financial_accounts,id|different:to_account_id',
            'to_account_id' => 'required|exists:financial_accounts,id',
            'amount' => 'required|numeric|min:1',
            'transfer_type' => 'required|in:internal_transfer,adjustment,refund',
            'related_order_id' => 'nullable|exists:orders,id',
            'reason' => 'nullable|string',
            'note' => 'nullable|string',
        ]);

        $validated['created_by'] = $request->user()->id;

        $transfer = $this->treasuryService->createTransfer($validated);

        try {
            $this->sheetsSyncService->sync('Chuyen_Tien', [$this->sheetsSyncService->formatTransferRow($transfer)]);
        } catch (\Throwable $e) {}

        return redirect()->route('admin.cashflow.transfers.index')
            ->with('success', "Giao dịch chuyển tiền nội bộ {$transfer->transfer_code} thành công!");
    }
}

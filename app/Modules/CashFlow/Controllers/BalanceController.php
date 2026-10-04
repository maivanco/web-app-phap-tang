<?php

namespace App\Modules\CashFlow\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\CashFlow\Models\DailyStaffBalance;
use App\Modules\CashFlow\Models\Expense;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\InternalTransfer;
use App\Modules\CashFlow\Models\OrderPayment;
use App\Modules\CashFlow\Services\GoogleSheetsSyncService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BalanceController extends Controller
{
    public function __construct(
        protected GoogleSheetsSyncService $sheetsSyncService
    ) {}

    /**
     * Display a listing of daily staff balances.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', DailyStaffBalance::class);

        $selectedDate = $request->input('date', now()->toDateString());
        $userId = $request->input('user_id');
        $accountId = $request->input('account_id');
        $status = $request->input('status');

        $query = DailyStaffBalance::with(['user', 'account'])
            ->whereDate('date', $selectedDate)
            ->orderByDesc('id');

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($accountId) {
            $query->where('account_id', $accountId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $balances = $query->get()->map(function (DailyStaffBalance $b) {
            $orderInflow = (float) OrderPayment::where('account_id', $b->account_id)
                ->where('status', 'completed')
                ->whereDate('payment_date', $b->date)
                ->sum('amount');

            $cardInflow = (float) OrderPayment::where('card_settlement_account_id', $b->account_id)
                ->where('status', 'reconciled')
                ->whereDate('card_settlement_date', $b->date)
                ->sum('actual_received_amount');

            $transfersIn = (float) InternalTransfer::where('to_account_id', $b->account_id)
                ->whereDate('transfer_date', $b->date)
                ->sum('amount');

            $transfersOut = (float) InternalTransfer::where('from_account_id', $b->account_id)
                ->whereDate('transfer_date', $b->date)
                ->sum('amount');

            $expensesOut = (float) Expense::where('account_id', $b->account_id)
                ->where('status', 'completed')
                ->whereDate('expense_date', $b->date)
                ->sum('total_amount');

            $totalIn = $orderInflow + $cardInflow + $transfersIn;
            $totalOut = $transfersOut + $expensesOut;
            $expectedBalance = (float) $b->opening_balance + $totalIn - $totalOut;
            $discrepancy = $b->closing_balance !== null ? ((float) $b->closing_balance - $expectedBalance) : null;

            return [
                'id' => $b->id,
                'date' => $b->date->toDateString(),
                'user' => [
                    'id' => $b->user->id,
                    'name' => $b->user->name,
                    'email' => $b->user->email,
                    'role' => $b->user->role,
                ],
                'account' => [
                    'id' => $b->account->id,
                    'code' => $b->account->code,
                    'letter_code' => $b->account->letter_code,
                    'name' => $b->account->name,
                ],
                'opening_balance' => (float) $b->opening_balance,
                'opened_at' => $b->opened_at?->toIso8601String(),
                'closing_balance' => $b->closing_balance !== null ? (float) $b->closing_balance : null,
                'closed_at' => $b->closed_at?->toIso8601String(),
                'total_in' => $totalIn,
                'total_out' => $totalOut,
                'expected_balance' => $expectedBalance,
                'discrepancy' => $discrepancy,
                'status' => $b->status,
                'note' => $b->note,
            ];
        });

        // Stats calculation
        $totalOpening = $balances->sum('opening_balance');
        $totalClosing = $balances->whereNotNull('closing_balance')->sum('closing_balance');
        $openCount = $balances->where('status', 'open')->count();
        $closedCount = $balances->where('status', 'closed')->count();
        $totalDiscrepancy = $balances->whereNotNull('discrepancy')->sum('discrepancy');

        // All users with their assigned bank accounts
        $staffMembers = User::with('financialAccount')
            ->orderBy('name')
            ->get();

        $accounts = FinancialAccount::where('status', 'active')
            ->where('type', 'bank')
            ->orderBy('name')
            ->get(['id', 'code', 'letter_code', 'name']);

        return Inertia::render('Admin/Modules/CashFlow/Balances/Index', [
            'balances' => $balances,
            'stats' => [
                'total_opening' => $totalOpening,
                'total_closing' => $totalClosing,
                'open_count' => $openCount,
                'closed_count' => $closedCount,
                'total_discrepancy' => $totalDiscrepancy,
            ],
            'filters' => [
                'date' => $selectedDate,
                'user_id' => $userId ? (int) $userId : '',
                'account_id' => $accountId ? (int) $accountId : '',
                'status' => $status ?? '',
            ],
            'staff_members' => $staffMembers,
            'accounts' => $accounts,
        ]);
    }

    /**
     * Store a manually created balance record.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', DailyStaffBalance::class);

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'user_id' => ['required', 'exists:users,id'],
            'account_id' => ['nullable', 'exists:financial_accounts,id'],
            'opening_balance' => ['required', 'numeric', 'min:0'],
            'closing_balance' => ['nullable', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = User::findOrFail($validated['user_id']);
        $accountId = $validated['account_id'] ?? $user->financial_account_id;
        if (!$accountId) {
            return back()->withErrors([
                'user_id' => 'Nhân viên này chưa được gán tài khoản ngân hàng nào. Vui lòng chọn tài khoản ngân hàng hoặc gán trong mục Quản lý nhân viên.',
            ]);
        }

        if (!$user->financial_account_id) {
            $user->update(['financial_account_id' => $accountId]);
        }

        $balance = DailyStaffBalance::where('user_id', $user->id)
            ->whereDate('date', $validated['date'])
            ->first();

        if ($balance) {
            $balance->update([
                'account_id' => $accountId,
                'opening_balance' => $validated['opening_balance'],
                'opened_at' => $balance->opened_at ?? now(),
                'closing_balance' => $validated['closing_balance'] ?? null,
                'closed_at' => isset($validated['closing_balance']) ? now() : null,
                'status' => isset($validated['closing_balance']) ? 'closed' : 'open',
                'note' => $validated['note'] ?? null,
            ]);
        } else {
            $balance = DailyStaffBalance::create([
                'date' => $validated['date'],
                'user_id' => $user->id,
                'account_id' => $accountId,
                'opening_balance' => $validated['opening_balance'],
                'opened_at' => now(),
                'closing_balance' => $validated['closing_balance'] ?? null,
                'closed_at' => isset($validated['closing_balance']) ? now() : null,
                'status' => isset($validated['closing_balance']) ? 'closed' : 'open',
                'note' => $validated['note'] ?? null,
            ]);
        }

        try {
            $this->sheetsSyncService->syncBalance($balance);
        } catch (\Throwable $e) {}

        return redirect()->route('admin.cashflow.balances.index', ['date' => $validated['date']])
            ->with('success', 'Đã lưu thông tin số dư thành công.');
    }

    /**
     * Update an existing daily balance record.
     */
    public function update(Request $request, DailyStaffBalance $balance): RedirectResponse
    {
        $this->authorize('update', $balance);

        $validated = $request->validate([
            'opening_balance' => ['required', 'numeric', 'min:0'],
            'closing_balance' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'string', 'in:open,closed'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $balance->update([
            'opening_balance' => $validated['opening_balance'],
            'closing_balance' => $validated['closing_balance'] ?? null,
            'closed_at' => $validated['status'] === 'closed' ? ($balance->closed_at ?? now()) : null,
            'status' => $validated['status'],
            'note' => $validated['note'] ?? null,
        ]);

        try {
            $this->sheetsSyncService->syncBalance($balance);
        } catch (\Throwable $e) {}

        return redirect()->route('admin.cashflow.balances.index', ['date' => $balance->date->toDateString()])
            ->with('success', 'Cập nhật số dư thành công.');
    }

    /**
     * Explicit manual sync of a balance row to Google Sheets.
     */
    public function syncSheets(DailyStaffBalance $balance): RedirectResponse
    {
        $this->authorize('update', $balance);

        if (!$this->sheetsSyncService->isConfigured()) {
            return back()->with('error', 'Chưa cấu hình Google Sheets Webhook URL trên hệ thống (vui lòng kiểm tra biến môi trường .env).');
        }

        $success = $this->sheetsSyncService->syncBalance($balance);

        if ($success) {
            return back()->with('success', "Đã đồng bộ số dư {$balance->user->name} ngày {$balance->date->format('d/m/Y')} lên Google Sheets thành công!");
        }

        return back()->with('error', "Đồng bộ số dư lên Google Sheets thất bại. Vui lòng kiểm tra Google Apps Script Webhook.");
    }
}

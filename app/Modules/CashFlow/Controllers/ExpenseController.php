<?php

namespace App\Modules\CashFlow\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\Expense;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Services\ExpenseService;
use App\Modules\CashFlow\Services\GoogleSheetsSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function __construct(
        protected ExpenseService $expenseService,
        protected GoogleSheetsSyncService $sheetsSyncService
    ) {}

    public function index(Request $request): Response
    {
        $query = Expense::with(['branch', 'account', 'creator'])->orderByDesc('id');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('expense_code', 'like', "%{$search}%")
                    ->orWhere('spender_name', 'like', "%{$search}%")
                    ->orWhere('content', 'like', "%{$search}%");
            });
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('expense_date', [$request->input('start_date'), $request->input('end_date')]);
        }

        $expenses = $query->paginate(15)->withQueryString();

        return Inertia::render('Admin/Modules/CashFlow/Expenses/Index', [
            'expenses' => $expenses,
            'filters' => $request->only(['search', 'branch_id', 'status', 'start_date', 'end_date']),
            'branches' => Branch::where('status', 'active')->orderBy('code')->get(),
            'bank_accounts' => FinancialAccount::where('status', 'active')->where('type', 'bank')->orderBy('letter_code')->get(),
        ]);
    }

    public function create(Request $request): Response
    {
        $selectedBranchId = $request->session()->get('active_branch_id');

        return Inertia::render('Admin/Modules/CashFlow/Expenses/Create', [
            'branches' => Branch::where('status', 'active')->orderBy('code')->get(),
            'bank_accounts' => FinancialAccount::where('status', 'active')
                ->where('type', 'bank') // Strictly excluding F
                ->orderBy('letter_code')
                ->get(),
            'selected_branch_id' => $selectedBranchId,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'expense_date' => 'nullable|date',
            'spender_name' => 'required|string|max:150',
            'content' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,bank_transfer',
            'account_id' => 'nullable|required_if:payment_method,bank_transfer|exists:financial_accounts,id',
            'note' => 'nullable|string',
        ]);

        $request->session()->put('active_branch_id', $validated['branch_id']);
        $validated['created_by'] = $request->user()->id;

        $expense = $this->expenseService->createExpense($validated);

        return redirect()->route('admin.cashflow.expenses.index')
            ->with('success', "Đơn chi tiêu {$expense->expense_code} đã được lưu thành công!");
    }

    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $this->authorize('update', $expense);

        $validated = $request->validate([
            'reason' => 'required|string|min:5',
            'spender_name' => 'required|string|max:150',
            'content' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
            'account_id' => 'nullable|exists:financial_accounts,id',
            'note' => 'nullable|string',
        ]);

        $reason = $validated['reason'];
        unset($validated['reason']);

        $this->expenseService->updateExpense($expense, $validated, $reason, $request->user()->id);

        return redirect()->route('admin.cashflow.expenses.index')
            ->with('success', "Khoản chi {$expense->expense_code} đã được cập nhật thành công!");
    }

    public function cancel(Request $request, Expense $expense): RedirectResponse
    {
        $this->authorize('delete', $expense);

        $validated = $request->validate([
            'reason' => 'required|string|min:5',
        ]);

        $this->expenseService->cancelExpense($expense, $validated['reason'], $request->user()->id);

        return redirect()->route('admin.cashflow.expenses.index')
            ->with('success', "Khoản chi {$expense->expense_code} đã được hủy bỏ thành công!");
    }

    public function syncSheets(Expense $expense): RedirectResponse
    {
        $this->authorize('view', $expense);

        if (!$this->sheetsSyncService->isConfigured()) {
            return back()->with('error', 'Chưa cấu hình Google Sheets Webhook URL trên hệ thống (vui lòng kiểm tra biến môi trường .env).');
        }

        $success = $this->sheetsSyncService->syncExpense($expense);

        if ($success) {
            return back()->with('success', "Đã đồng bộ khoản chi {$expense->expense_code} lên Google Sheets thành công!");
        }

        return back()->with('error', "Đồng bộ khoản chi {$expense->expense_code} lên Google Sheets thất bại. Vui lòng kiểm tra Google Apps Script Webhook.");
    }
}

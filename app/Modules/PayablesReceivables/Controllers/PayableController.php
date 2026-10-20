<?php

namespace App\Modules\PayablesReceivables\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\PayablesReceivables\Models\AccountPayable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayableController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', AccountPayable::class);

        // Overall summary statistics
        $allPayablesQuery = AccountPayable::query();
        $totalAmount = (float) $allPayablesQuery->sum('amount');
        $unpaidAmount = (float) AccountPayable::where('status', 'unpaid')->sum('amount');
        $paidAmount = (float) AccountPayable::where('status', 'paid')->sum('amount');
        $unpaidCount = AccountPayable::where('status', 'unpaid')->count();
        $paidCount = AccountPayable::where('status', 'paid')->count();

        // Filtered listing query
        $query = AccountPayable::with(['creator', 'paidAccount']);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('supplier_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && in_array($request->input('status'), ['unpaid', 'paid'], true)) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('start_date')) {
            $query->whereDate('due_date', '>=', $request->input('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('due_date', '<=', $request->input('end_date'));
        }

        $payables = $query->orderByRaw("CASE WHEN status = 'unpaid' THEN 0 ELSE 1 END")
            ->orderBy('due_date', 'asc')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        $financialAccounts = FinancialAccount::where('status', 'active')
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Modules/PayablesReceivables/Payables/Index', [
            'payables' => $payables,
            'summary' => [
                'total_amount' => $totalAmount,
                'unpaid_amount' => $unpaidAmount,
                'paid_amount' => $paidAmount,
                'unpaid_count' => $unpaidCount,
                'paid_count' => $paidCount,
            ],
            'filters' => $request->only(['search', 'status', 'start_date', 'end_date']),
            'financial_accounts' => $financialAccounts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', AccountPayable::class);

        $validated = $request->validate([
            'supplier_name' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
            'amount' => 'required|numeric|gt:0',
            'due_date' => 'nullable|date',
            'status' => 'required|in:unpaid,paid',
            'paid_account_id' => 'nullable|exists:financial_accounts,id',
            'paid_at' => 'nullable|date',
            'paid_notes' => 'nullable|string|max:500',
        ], [
            'supplier_name.required' => 'Vui lòng nhập tên nhà cung cấp / người nhận tiền.',
            'description.required' => 'Vui lòng nhập nội dung mô tả khoản nợ.',
            'amount.required' => 'Vui lòng nhập số tiền.',
            'amount.gt' => 'Số tiền phải lớn hơn 0.',
        ]);

        $validated['created_by'] = $request->user()->id;

        if ($validated['status'] === 'paid') {
            $validated['paid_at'] = $validated['paid_at'] ?? now()->toDateString();
        } else {
            $validated['paid_at'] = null;
            $validated['paid_account_id'] = null;
        }

        AccountPayable::create($validated);

        return redirect()->route('admin.payables-receivables.payables.index')
            ->with('success', 'Đã tạo khoản công nợ phải trả thành công!');
    }

    public function update(Request $request, AccountPayable $payable): RedirectResponse
    {
        $this->authorize('update', $payable);

        $validated = $request->validate([
            'supplier_name' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
            'amount' => 'required|numeric|gt:0',
            'due_date' => 'nullable|date',
            'status' => 'required|in:unpaid,paid',
            'paid_account_id' => 'nullable|exists:financial_accounts,id',
            'paid_at' => 'nullable|date',
            'paid_notes' => 'nullable|string|max:500',
        ], [
            'supplier_name.required' => 'Vui lòng nhập tên nhà cung cấp / người nhận tiền.',
            'description.required' => 'Vui lòng nhập nội dung mô tả khoản nợ.',
            'amount.required' => 'Vui lòng nhập số tiền.',
            'amount.gt' => 'Số tiền phải lớn hơn 0.',
        ]);

        if ($validated['status'] === 'paid') {
            $validated['paid_at'] = $validated['paid_at'] ?? ($payable->paid_at ? $payable->paid_at->toDateString() : now()->toDateString());
        } else {
            $validated['paid_at'] = null;
            $validated['paid_account_id'] = null;
        }

        $payable->update($validated);

        return redirect()->route('admin.payables-receivables.payables.index')
            ->with('success', 'Đã cập nhật công nợ phải trả thành công!');
    }

    public function markPaid(Request $request, AccountPayable $payable): RedirectResponse
    {
        $this->authorize('update', $payable);

        $validated = $request->validate([
            'paid_account_id' => 'nullable|exists:financial_accounts,id',
            'paid_at' => 'nullable|date',
            'paid_notes' => 'nullable|string|max:500',
        ]);

        $payable->update([
            'status' => 'paid',
            'paid_at' => $validated['paid_at'] ?? now()->toDateString(),
            'paid_account_id' => $validated['paid_account_id'] ?? null,
            'paid_notes' => $validated['paid_notes'] ?? $payable->paid_notes,
        ]);

        return redirect()->route('admin.payables-receivables.payables.index')
            ->with('success', "Đã đánh dấu khoản nợ cho \"{$payable->supplier_name}\" là đã thanh toán!");
    }

    public function destroy(AccountPayable $payable): RedirectResponse
    {
        $this->authorize('delete', $payable);

        $payable->delete();

        return redirect()->route('admin.payables-receivables.payables.index')
            ->with('success', 'Đã xóa khoản công nợ thành công!');
    }
}

<?php

namespace App\Modules\CashFlow\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\InitialBalance;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FinancialAccountController extends Controller
{
    /**
     * Display a listing of financial accounts.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', FinancialAccount::class);

        $query = FinancialAccount::with(['branch', 'latestInitialBalance'])
            ->withCount(['payments', 'expenses', 'transfersIn', 'transfersOut', 'users', 'dailyBalances'])
            ->orderBy('type')
            ->orderBy('code');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('letter_code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        $accounts = $query->paginate(20)->withQueryString();

        // Append total transaction count for UI convenience
        $accounts->getCollection()->transform(function ($account) {
            $account->total_transactions = $account->payments_count
                + $account->expenses_count
                + $account->transfers_in_count
                + $account->transfers_out_count
                + $account->users_count
                + $account->daily_balances_count;
            return $account;
        });

        $stats = [
            'total' => FinancialAccount::count(),
            'cash' => FinancialAccount::where('type', 'cash')->count(),
            'bank' => FinancialAccount::where('type', 'bank')->count(),
            'card_gateway' => FinancialAccount::where('type', 'card_gateway')->count(),
            'active' => FinancialAccount::where('status', 'active')->count(),
        ];

        $branches = Branch::where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        return Inertia::render('Admin/Modules/CashFlow/FinancialAccounts/Index', [
            'accounts' => $accounts,
            'branches' => $branches,
            'stats' => $stats,
            'filters' => [
                'search' => $request->input('search', ''),
                'type' => $request->input('type', ''),
                'status' => $request->input('status', ''),
                'branch_id' => $request->input('branch_id', ''),
            ],
        ]);
    }

    /**
     * Store a newly created financial account in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', FinancialAccount::class);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:financial_accounts,code'],
            'letter_code' => ['nullable', 'string', 'max:10'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::in(['cash', 'bank', 'card_gateway'])],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'status' => ['required', 'string', Rule::in(['active', 'inactive'])],
            'initial_amount' => ['nullable', 'numeric', 'min:0'],
            'initial_date' => ['nullable', 'date'],
            'initial_note' => ['nullable', 'string', 'max:255'],
        ]);

        // Auto uppercase codes for neatness
        $code = strtoupper(trim($validated['code']));
        $letterCode = !empty($validated['letter_code']) ? strtoupper(trim($validated['letter_code'])) : null;

        DB::transaction(function () use ($validated, $code, $letterCode, $request) {
            $account = FinancialAccount::create([
                'code' => $code,
                'letter_code' => $letterCode,
                'name' => trim($validated['name']),
                'type' => $validated['type'],
                'branch_id' => $validated['type'] === 'cash' ? ($validated['branch_id'] ?? null) : ($validated['branch_id'] ?? null),
                'status' => $validated['status'],
            ]);

            if (isset($validated['initial_amount']) && $validated['initial_amount'] !== null && $validated['initial_amount'] !== '') {
                InitialBalance::create([
                    'account_id' => $account->id,
                    'effective_date' => $validated['initial_date'] ?? now()->startOfYear()->toDateString(),
                    'initial_amount' => (float) $validated['initial_amount'],
                    'note' => $validated['initial_note'] ?? ('Số dư ban đầu ' . $account->name),
                    'created_by' => $request->user()?->id,
                ]);
            }
        });

        return redirect()->route('admin.cashflow.financial-accounts.index')
            ->with('success', 'Thêm quỹ / tài khoản tài chính mới thành công.');
    }

    /**
     * Update the specified financial account in storage.
     */
    public function update(Request $request, FinancialAccount $financialAccount): RedirectResponse
    {
        $this->authorize('update', $financialAccount);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('financial_accounts', 'code')->ignore($financialAccount->id)],
            'letter_code' => ['nullable', 'string', 'max:10'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::in(['cash', 'bank', 'card_gateway'])],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'status' => ['required', 'string', Rule::in(['active', 'inactive'])],
            'initial_amount' => ['nullable', 'numeric', 'min:0'],
            'initial_date' => ['nullable', 'date'],
            'initial_note' => ['nullable', 'string', 'max:255'],
        ]);

        $code = strtoupper(trim($validated['code']));
        $letterCode = !empty($validated['letter_code']) ? strtoupper(trim($validated['letter_code'])) : null;

        DB::transaction(function () use ($financialAccount, $validated, $code, $letterCode, $request) {
            $financialAccount->update([
                'code' => $code,
                'letter_code' => $letterCode,
                'name' => trim($validated['name']),
                'type' => $validated['type'],
                'branch_id' => $validated['branch_id'] ?? null,
                'status' => $validated['status'],
            ]);

            if (isset($validated['initial_amount']) && $validated['initial_amount'] !== null && $validated['initial_amount'] !== '') {
                $initial = InitialBalance::where('account_id', $financialAccount->id)
                    ->orderByDesc('effective_date')
                    ->first();

                if ($initial) {
                    $initial->update([
                        'initial_amount' => (float) $validated['initial_amount'],
                        'effective_date' => $validated['initial_date'] ?? $initial->effective_date,
                        'note' => $validated['initial_note'] ?? $initial->note,
                    ]);
                } else {
                    InitialBalance::create([
                        'account_id' => $financialAccount->id,
                        'effective_date' => $validated['initial_date'] ?? now()->startOfYear()->toDateString(),
                        'initial_amount' => (float) $validated['initial_amount'],
                        'note' => $validated['initial_note'] ?? ('Số dư ban đầu ' . $financialAccount->name),
                        'created_by' => $request->user()?->id,
                    ]);
                }
            }
        });

        return redirect()->route('admin.cashflow.financial-accounts.index')
            ->with('success', 'Cập nhật thông tin quỹ / tài khoản tài chính thành công.');
    }

    /**
     * Remove the specified financial account from storage.
     */
    public function destroy(FinancialAccount $financialAccount): RedirectResponse
    {
        $this->authorize('delete', $financialAccount);

        $hasTransactions = $financialAccount->payments()->exists()
            || $financialAccount->expenses()->exists()
            || $financialAccount->transfersOut()->exists()
            || $financialAccount->transfersIn()->exists()
            || $financialAccount->users()->exists()
            || $financialAccount->dailyBalances()->exists();

        if ($hasTransactions) {
            return back()->with('error', 'Không thể xóa quỹ/tài khoản này vì đã có dữ liệu giao dịch hoặc nhân viên liên kết. Vui lòng đổi trạng thái sang "Ngưng hoạt động" (inactive).');
        }

        $financialAccount->initialBalances()->delete();
        $financialAccount->delete();

        return redirect()->route('admin.cashflow.financial-accounts.index')
            ->with('success', 'Đã xóa quỹ / tài khoản tài chính thành công.');
    }
}

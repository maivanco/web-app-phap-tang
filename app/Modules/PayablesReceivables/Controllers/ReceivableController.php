<?php

namespace App\Modules\PayablesReceivables\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Services\GoogleSheetsSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class ReceivableController extends Controller
{
    public function __construct(
        protected GoogleSheetsSyncService $sheetsSyncService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Order::class);

        // Base query for unpaid orders
        $baseQuery = Order::query()
            ->where('orders.status', '!=', 'cancelled')
            ->whereHas('payment', function ($q) {
                $q->where('method', 'unpaid')
                  ->orWhere('status', 'unpaid');
            });

        // Summary calculations across all unpaid orders
        $totalUnpaidAmount = (float) (clone $baseQuery)->sum('orders.net_revenue');
        $totalUnpaidCount = (int) (clone $baseQuery)->count();

        // Branch summary breakdown
        $branchSummary = (clone $baseQuery)
            ->join('branches', 'orders.branch_id', '=', 'branches.id')
            ->selectRaw('branches.name as branch_name, branches.code as branch_code, COUNT(orders.id) as count, SUM(orders.net_revenue) as total_amount')
            ->groupBy('branches.id', 'branches.name', 'branches.code')
            ->get();

        // Filtered listing query
        $query = (clone $baseQuery)->with(['branch', 'consultant', 'payment.account', 'creator', 'items.brand']);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('order_code', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        if ($request->filled('start_date')) {
            $query->whereDate('sale_date', '>=', $request->input('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('sale_date', '<=', $request->input('end_date'));
        }

        $orders = $query->orderByDesc('sale_date')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        $branches = Branch::where('status', 'active')
            ->orderBy('code')
            ->get();

        $financialAccounts = FinancialAccount::where('status', 'active')
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Modules/PayablesReceivables/Receivables/Index', [
            'orders' => $orders,
            'summary' => [
                'total_unpaid_amount' => $totalUnpaidAmount,
                'total_unpaid_count' => $totalUnpaidCount,
                'branch_summary' => $branchSummary,
            ],
            'filters' => $request->only(['search', 'branch_id', 'start_date', 'end_date']),
            'branches' => $branches,
            'financial_accounts' => $financialAccounts,
        ]);
    }

    public function settle(Request $request, Order $order): RedirectResponse
    {
        $this->authorize('update', $order);

        if ($order->status === 'cancelled') {
            return redirect()->back()->with('error', 'Không thể thu tiền đơn hàng đã bị hủy.');
        }

        $payment = $order->payment;
        if (!$payment || ($payment->method !== 'unpaid' && $payment->status !== 'unpaid')) {
            return redirect()->back()->with('error', 'Đơn hàng này không ở trạng thái công nợ chưa thanh toán.');
        }

        $validated = $request->validate([
            'payment_method' => 'required|in:cash,bank_transfer',
            'payment_account_id' => 'nullable|required_if:payment_method,bank_transfer|exists:financial_accounts,id',
            'payment_date' => 'required|date',
        ], [
            'payment_method.required' => 'Vui lòng chọn hình thức thanh toán.',
            'payment_account_id.required_if' => 'Vui lòng chọn tài khoản ngân hàng nhận tiền.',
            'payment_date.required' => 'Vui lòng nhập ngày thu tiền.',
        ]);

        $method = $validated['payment_method'];
        $accountId = null;

        if ($method === 'cash') {
            $cashAccount = FinancialAccount::where('branch_id', $order->branch_id)
                ->where('type', 'cash')
                ->first();

            if (!$cashAccount) {
                return redirect()->back()->with('error', 'Không tìm thấy quỹ tiền mặt của chi nhánh đơn hàng.');
            }
            $accountId = $cashAccount->id;
        } else {
            $accountId = $validated['payment_account_id'];
        }

        $payment->update([
            'method' => $method,
            'account_id' => $accountId,
            'payment_date' => $validated['payment_date'],
            'status' => 'completed',
            'settled_by' => $request->user()->id,
        ]);

        // Attempt Google Sheets sync for payment
        try {
            $freshPayment = $payment->fresh(['account', 'order']);
            if ($freshPayment) {
                $this->sheetsSyncService->sync('Thanh_Toan', [$this->sheetsSyncService->formatPaymentRow($freshPayment)]);
            }
        } catch (\Throwable) {
            // Keep going if sync fails
        }

        return redirect()->route('admin.payables-receivables.receivables.index')
            ->with('success', "Thu tiền thành công cho đơn hàng {$order->order_code}!");
    }
}

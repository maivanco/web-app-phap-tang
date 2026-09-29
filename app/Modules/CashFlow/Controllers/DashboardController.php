<?php

namespace App\Modules\CashFlow\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\Brand;
use App\Modules\CashFlow\Models\CustomerSource;
use App\Modules\CashFlow\Models\Expense;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Models\OrderItem;
use App\Modules\CashFlow\Models\OrderPayment;
use App\Modules\CashFlow\Services\TreasuryService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected TreasuryService $treasuryService
    ) {}

    public function index(Request $request): Response
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $branchId = $request->input('branch_id');
        $brandId = $request->input('brand_id');

        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->endOfDay();

        // Base Orders Query (completed only for reporting)
        $ordersQuery = Order::where('status', 'completed')
            ->whereBetween('sale_date', [$start->toDateString(), $end->toDateString()]);

        if ($branchId) {
            $ordersQuery->where('branch_id', $branchId);
        }

        if ($brandId) {
            $ordersQuery->whereHas('items', function ($q) use ($brandId) {
                $q->where('brand_id', $brandId);
            });
        }

        // Summary KPI Metrics
        $totalGross = (float) (clone $ordersQuery)->sum('gross_amount');
        $totalDiscount = (float) (clone $ordersQuery)->sum('discount_amount');
        $totalNetRevenue = (float) (clone $ordersQuery)->sum('net_revenue');
        $orderCount = (clone $ordersQuery)->count();

        // Total Expenses
        $expensesQuery = Expense::where('status', 'completed')
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()]);
        if ($branchId) {
            $expensesQuery->where('branch_id', $branchId);
        }
        $totalExpenses = (float) $expensesQuery->sum('total_amount');

        // Revenue by Branch
        $revenueByBranch = Order::where('status', 'completed')
            ->whereBetween('sale_date', [$start->toDateString(), $end->toDateString()])
            ->select('branch_id', DB::raw('SUM(net_revenue) as revenue'), DB::raw('COUNT(*) as count'))
            ->groupBy('branch_id')
            ->with('branch')
            ->get()
            ->map(function ($row) use ($totalNetRevenue) {
                return [
                    'branch_id' => $row->branch_id,
                    'branch_name' => $row->branch?->name ?? 'Unknown',
                    'revenue' => (float) $row->revenue,
                    'count' => (int) $row->count,
                    'percentage' => $totalNetRevenue > 0 ? round(($row->revenue / $totalNetRevenue) * 100, 1) : 0,
                ];
            });

        // Revenue by Brand (from order items)
        $orderIds = (clone $ordersQuery)->pluck('id');
        $revenueByBrand = OrderItem::whereIn('order_id', $orderIds)
            ->select('brand_id', DB::raw('SUM(net_amount) as revenue'), DB::raw('SUM(quantity) as total_qty'))
            ->groupBy('brand_id')
            ->with('brand')
            ->get()
            ->map(function ($row) use ($totalNetRevenue) {
                return [
                    'brand_id' => $row->brand_id,
                    'brand_name' => $row->brand?->name ?? 'Unknown',
                    'revenue' => (float) $row->revenue,
                    'total_qty' => (int) $row->total_qty,
                    'percentage' => $totalNetRevenue > 0 ? round(($row->revenue / $totalNetRevenue) * 100, 1) : 0,
                ];
            });

        // Revenue by Customer Source
        $revenueBySource = Order::where('status', 'completed')
            ->whereBetween('sale_date', [$start->toDateString(), $end->toDateString()])
            ->select('customer_source_id', DB::raw('SUM(net_revenue) as revenue'), DB::raw('COUNT(*) as count'))
            ->groupBy('customer_source_id')
            ->with('customerSource')
            ->get()
            ->map(function ($row) use ($totalNetRevenue) {
                return [
                    'source_id' => $row->customer_source_id,
                    'source_name' => $row->customerSource?->name ?? 'Unknown',
                    'revenue' => (float) $row->revenue,
                    'count' => (int) $row->count,
                    'percentage' => $totalNetRevenue > 0 ? round(($row->revenue / $totalNetRevenue) * 100, 1) : 0,
                ];
            });

        // Card Swipes Status
        $pendingCards = OrderPayment::where('method', 'card_swipe')
            ->where('status', 'pending_settlement')
            ->select(DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total'))
            ->first();

        $reconciledCards = OrderPayment::where('method', 'card_swipe')
            ->where('status', 'reconciled')
            ->whereBetween('card_settlement_date', [$start->toDateString(), $end->toDateString()])
            ->select(
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(actual_received_amount) as total_received'),
                DB::raw('SUM(fee_amount) as total_fees')
            )
            ->first();

        // Account Balances
        $accountsBalances = $this->treasuryService->getAllBalances($end->toDateString());

        return Inertia::render('Admin/Modules/CashFlow/Dashboard/Index', [
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'branch_id' => $branchId ? (int) $branchId : null,
                'brand_id' => $brandId ? (int) $brandId : null,
            ],
            'kpis' => [
                'gross_amount' => $totalGross,
                'discount_amount' => $totalDiscount,
                'net_revenue' => $totalNetRevenue,
                'order_count' => $orderCount,
                'total_expenses' => $totalExpenses,
                'net_operating' => $totalNetRevenue - $totalExpenses,
            ],
            'revenue_by_branch' => $revenueByBranch,
            'revenue_by_brand' => $revenueByBrand,
            'revenue_by_source' => $revenueBySource,
            'card_stats' => [
                'pending_count' => (int) ($pendingCards->count ?? 0),
                'pending_amount' => (float) ($pendingCards->total ?? 0),
                'reconciled_count' => (int) ($reconciledCards->count ?? 0),
                'reconciled_amount' => (float) ($reconciledCards->total_received ?? 0),
                'reconciled_fees' => (float) ($reconciledCards->total_fees ?? 0),
            ],
            'accounts_balances' => $accountsBalances,
            'branches' => Branch::where('status', 'active')->orderBy('code')->get(),
            'brands' => Brand::where('status', 'active')->orderBy('code')->get(),
            'customer_sources' => CustomerSource::where('status', 'active')->orderBy('code')->get(),
        ]);
    }
}

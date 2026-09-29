<?php

namespace App\Modules\CashFlow\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\CashFlow\Models\Brand;
use App\Modules\CashFlow\Models\CustomerSource;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Services\GoogleSheetsSyncService;
use App\Modules\CashFlow\Services\OrderCalculationService;
use App\Modules\CashFlow\Services\OrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function __construct(
        protected OrderService $orderService,
        protected OrderCalculationService $calculationService,
        protected GoogleSheetsSyncService $sheetsSyncService
    ) {}

    public function index(Request $request): Response
    {
        $query = Order::with(['branch', 'customerSource', 'payment.account', 'items.brand', 'creator'])
            ->orderByDesc('id');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('order_code', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhere('consultant_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('sale_date', [$request->input('start_date'), $request->input('end_date')]);
        }

        $orders = $query->paginate(15)->withQueryString();

        return Inertia::render('Admin/Modules/CashFlow/Orders/Index', [
            'orders' => $orders,
            'filters' => $request->only(['search', 'branch_id', 'status', 'start_date', 'end_date']),
            'branches' => Branch::where('status', 'active')->orderBy('code')->get(),
        ]);
    }

    public function create(Request $request): Response
    {
        // Session branch persistence
        $selectedBranchId = $request->session()->get('active_branch_id');

        return Inertia::render('Admin/Modules/CashFlow/Orders/Create', [
            'branches' => Branch::where('status', 'active')->orderBy('code')->get(),
            'customer_sources' => CustomerSource::where('status', 'active')->orderBy('code')->get(),
            'brands' => Brand::where('status', 'active')->orderBy('code')->get(),
            'bank_accounts' => FinancialAccount::where('status', 'active')
                ->where('type', 'bank')
                ->orderBy('letter_code')
                ->get(),
            'selected_branch_id' => $selectedBranchId,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'sale_date' => 'nullable|date',
            'consultant_name' => 'required|string|max:150',
            'customer_name' => 'required|string|max:150',
            'customer_phone' => ['required', 'string', 'regex:/^0[0-9]{8,11}$/'],
            'customer_gender' => 'required|in:Nam,Nữ',
            'customer_source_id' => 'required|exists:customer_sources,id',
            'discount_code' => 'required|in:A,B,C,D,E',
            'note' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.brand_id' => 'required|exists:brands,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,bank_transfer,card_swipe',
            'payment_account_id' => 'nullable|required_if:payment_method,bank_transfer|exists:financial_accounts,id',
            'card_swipe_date' => 'nullable|required_if:payment_method,card_swipe|date',
        ]);

        // Remember branch in session
        $request->session()->put('active_branch_id', $validated['branch_id']);

        $validated['created_by'] = $request->user()->id;

        $order = $this->orderService->createOrder($validated);

        // Optional Google Sheets sync
        try {
            $this->sheetsSyncService->sync('Don_Hang', [$this->sheetsSyncService->formatOrderRow($order)]);
            $itemRows = [];
            foreach ($order->items as $item) {
                $itemRows[] = $this->sheetsSyncService->formatOrderItemRow($item, $order);
            }
            $this->sheetsSyncService->sync('Chi_Tiet_Don', $itemRows);
            if ($order->payment) {
                $this->sheetsSyncService->sync('Thanh_Toan', [$this->sheetsSyncService->formatPaymentRow($order->payment)]);
            }
        } catch (\Throwable $e) {
            // Keep going even if sync fails
        }

        return redirect()->route('admin.cashflow.orders.show', $order->id)
            ->with('success', "Đơn hàng {$order->order_code} đã được lưu thành công!");
    }

    public function show(Order $order): Response
    {
        $order->load([
            'branch',
            'customerSource',
            'items.brand',
            'payment.account',
            'payment.settlementAccount',
            'payment.settledByUser',
            'creator',
            'audits.user',
        ]);

        return Inertia::render('Admin/Modules/CashFlow/Orders/Show', [
            'order' => $order,
        ]);
    }

    public function update(Request $request, Order $order): RedirectResponse
    {
        $this->authorize('update', $order);

        $validated = $request->validate([
            'reason' => 'required|string|min:5',
            'consultant_name' => 'required|string|max:150',
            'customer_name' => 'required|string|max:150',
            'customer_phone' => ['required', 'string', 'regex:/^0[0-9]{8,11}$/'],
            'customer_gender' => 'required|in:Nam,Nữ',
            'customer_source_id' => 'required|exists:customer_sources,id',
            'discount_code' => 'required|in:A,B,C,D,E',
            'note' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.brand_id' => 'required|exists:brands,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $reason = $validated['reason'];
        unset($validated['reason']);

        $this->orderService->updateOrder($order, $validated, $reason, $request->user()->id);

        return redirect()->route('admin.cashflow.orders.show', $order->id)
            ->with('success', "Đơn hàng {$order->order_code} đã được cập nhật thành công (Phiên bản: {$order->version})!");
    }

    public function cancel(Request $request, Order $order): RedirectResponse
    {
        $this->authorize('delete', $order);

        $validated = $request->validate([
            'reason' => 'required|string|min:5',
        ]);

        $this->orderService->cancelOrder($order, $validated['reason'], $request->user()->id);

        return redirect()->route('admin.cashflow.orders.show', $order->id)
            ->with('success', "Đơn hàng {$order->order_code} đã được hủy bỏ có lý do lưu vết!");
    }
}

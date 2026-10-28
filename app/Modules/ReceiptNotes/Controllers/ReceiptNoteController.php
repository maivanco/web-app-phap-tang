<?php

namespace App\Modules\ReceiptNotes\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CashFlow\Models\Branch;
use App\Modules\ReceiptNotes\Models\ReceiptNote;
use App\Modules\ReceiptNotes\Services\ReceiptNoteService;
use App\Services\ExcelExportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReceiptNoteController extends Controller
{
    public function __construct(
        protected ReceiptNoteService $receiptNoteService
    ) {}

    /**
     * Display a listing of receipt notes.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ReceiptNote::class);

        // Stats summary
        $totalNotes = ReceiptNote::count();
        $pendingCount = ReceiptNote::where('status', 'chua_giao')->count();
        $deliveredCount = ReceiptNote::where('status', 'da_giao')->count();
        $totalEstimated = (float) ReceiptNote::sum('estimated_price');
        $totalCollected = (float) ReceiptNote::where('status', 'da_giao')->sum('final_amount');

        // Query with filters
        $query = ReceiptNote::with(['branch', 'creator']);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('note_code', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && in_array($request->input('status'), ['chua_giao', 'da_giao', 'da_huy'], true)) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        if ($request->filled('start_date')) {
            $query->whereDate('received_date', '>=', $request->input('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('received_date', '<=', $request->input('end_date'));
        }

        $receiptNotes = $query->orderByRaw("CASE WHEN status = 'chua_giao' THEN 0 ELSE 1 END")
            ->orderByDesc('received_date')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        $branches = Branch::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name']);

        return Inertia::render('Admin/Modules/ReceiptNotes/Index', [
            'receiptNotes' => $receiptNotes,
            'summary' => [
                'total_notes' => $totalNotes,
                'pending_count' => $pendingCount,
                'delivered_count' => $deliveredCount,
                'total_estimated' => $totalEstimated,
                'total_collected' => $totalCollected,
            ],
            'filters' => $request->only(['search', 'status', 'branch_id', 'start_date', 'end_date']),
            'branches' => $branches,
        ]);
    }

    /**
     * Show form for creating a new receipt note.
     */
    public function create(): Response
    {
        $this->authorize('create', ReceiptNote::class);

        $branches = Branch::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name']);

        return Inertia::render('Admin/Modules/ReceiptNotes/Create', [
            'branches' => $branches,
            'suggestedCode' => $this->receiptNoteService->generateNoteCode(),
            'today' => now()->toDateString(),
        ]);
    }

    /**
     * Store a newly created receipt note.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', ReceiptNote::class);

        $validated = $request->validate([
            'note_code' => 'nullable|string|max:50|unique:receipt_notes,note_code',
            'received_date' => 'required|date',
            'appointment_date' => 'nullable|date',
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'service_types' => 'nullable|array',
            'service_types.*' => 'string|in:thay_day,that_lai,chinh_size,khac',
            'other_service_description' => 'nullable|string|max:500',
            'estimated_price' => 'nullable|numeric|min:0',
            'estimated_pickup_time' => 'nullable|string|max:100',
            'has_photos_saved' => 'nullable|boolean',
            'inspected_at_counter' => 'nullable|boolean',
            'final_amount' => 'nullable|numeric|min:0',
            'status' => 'required|in:chua_giao,da_giao,da_huy',
            'delivered_at' => 'nullable|date',
            'proxy_receiver_info' => 'nullable|string|max:500',
            'receiver_signature' => 'nullable|string|max:255',
            'delivery_staff_name' => 'nullable|string|max:255',
            'branch_id' => 'nullable|exists:branches,id',
            'notes' => 'nullable|string|max:1000',
        ], [
            'customer_name.required' => 'Vui lòng nhập tên khách hàng.',
            'received_date.required' => 'Vui lòng chọn ngày nhận.',
            'note_code.unique' => 'Mã phiếu giao nhận đã tồn tại.',
        ]);

        $receiptNote = $this->receiptNoteService->createReceiptNote($validated, $request->user());

        return redirect()->route('admin.receipt-notes.show', $receiptNote)
            ->with('success', "Đã tạo phiếu giao nhận {$receiptNote->note_code} thành công và đồng bộ Google Sheets!");
    }

    /**
     * Display the specified receipt note (printable view).
     */
    public function show(ReceiptNote $receiptNote): Response
    {
        $this->authorize('view', $receiptNote);

        $receiptNote->loadMissing(['branch', 'creator']);

        return Inertia::render('Admin/Modules/ReceiptNotes/Show', [
            'receiptNote' => $receiptNote,
        ]);
    }

    /**
     * Show the form for editing the specified receipt note.
     */
    public function edit(ReceiptNote $receiptNote): Response
    {
        $this->authorize('update', $receiptNote);

        $receiptNote->loadMissing(['branch', 'creator']);
        $branches = Branch::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name']);

        return Inertia::render('Admin/Modules/ReceiptNotes/Edit', [
            'receiptNote' => $receiptNote,
            'branches' => $branches,
        ]);
    }

    /**
     * Update the specified receipt note.
     */
    public function update(Request $request, ReceiptNote $receiptNote): RedirectResponse
    {
        $this->authorize('update', $receiptNote);

        $validated = $request->validate([
            'note_code' => "required|string|max:50|unique:receipt_notes,note_code,{$receiptNote->id}",
            'received_date' => 'required|date',
            'appointment_date' => 'nullable|date',
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'service_types' => 'nullable|array',
            'service_types.*' => 'string|in:thay_day,that_lai,chinh_size,khac',
            'other_service_description' => 'nullable|string|max:500',
            'estimated_price' => 'nullable|numeric|min:0',
            'estimated_pickup_time' => 'nullable|string|max:100',
            'has_photos_saved' => 'nullable|boolean',
            'inspected_at_counter' => 'nullable|boolean',
            'final_amount' => 'nullable|numeric|min:0',
            'status' => 'required|in:chua_giao,da_giao,da_huy',
            'delivered_at' => 'nullable|date',
            'proxy_receiver_info' => 'nullable|string|max:500',
            'receiver_signature' => 'nullable|string|max:255',
            'delivery_staff_name' => 'nullable|string|max:255',
            'branch_id' => 'nullable|exists:branches,id',
            'notes' => 'nullable|string|max:1000',
        ], [
            'customer_name.required' => 'Vui lòng nhập tên khách hàng.',
            'received_date.required' => 'Vui lòng chọn ngày nhận.',
            'note_code.required' => 'Vui lòng nhập mã phiếu.',
            'note_code.unique' => 'Mã phiếu giao nhận đã tồn tại.',
        ]);

        $this->receiptNoteService->updateReceiptNote($receiptNote, $validated);

        return redirect()->route('admin.receipt-notes.index')
            ->with('success', "Cập nhật phiếu {$receiptNote->note_code} thành công và đồng bộ Google Sheets!");
    }

    /**
     * Quick deliver action.
     */
    public function markDelivered(Request $request, ReceiptNote $receiptNote): RedirectResponse
    {
        $this->authorize('update', $receiptNote);

        $validated = $request->validate([
            'final_amount' => 'nullable|numeric|min:0',
            'delivery_staff_name' => 'nullable|string|max:255',
            'receiver_signature' => 'nullable|string|max:255',
            'proxy_receiver_info' => 'nullable|string|max:500',
            'delivered_at' => 'nullable|date',
        ]);

        $this->receiptNoteService->markAsDelivered($receiptNote, $validated);

        return back()->with('success', "Phiếu {$receiptNote->note_code} đã được chuyển sang trạng thái Đã giao!");
    }

    /**
     * Remove the specified receipt note.
     */
    public function destroy(ReceiptNote $receiptNote): RedirectResponse
    {
        $this->authorize('delete', $receiptNote);

        $code = $receiptNote->note_code;
        $receiptNote->delete();

        return redirect()->route('admin.receipt-notes.index')
            ->with('success', "Đã xóa phiếu giao nhận {$code} thành công.");
    }

    /**
     * Export receipt notes to Excel using ExcelExportService.
     */
    public function export(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', ReceiptNote::class);

        $query = ReceiptNote::with(['branch', 'creator']);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('note_code', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && in_array($request->input('status'), ['chua_giao', 'da_giao', 'da_huy'], true)) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        if ($request->filled('start_date')) {
            $query->whereDate('received_date', '>=', $request->input('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('received_date', '<=', $request->input('end_date'));
        }

        $query->orderByDesc('received_date')->orderByDesc('id');

        return ExcelExportService::make()
            ->title('PHIẾU GIAO NHẬN VÒNG THẮT / SỬA MGEMS')
            ->sheetName('Phieu_Giao_Nhan')
            ->columns([
                ['header' => 'Mã đơn', 'key' => 'note_code', 'format' => 'string'],
                ['header' => 'Ngày nhận', 'key' => 'received_date', 'format' => 'date'],
                ['header' => 'Ngày hẹn trả', 'key' => 'appointment_date', 'format' => 'date'],
                ['header' => 'Tên khách', 'key' => 'customer_name'],
                ['header' => 'Số điện thoại', 'key' => 'customer_phone', 'format' => 'string'],
                ['header' => 'Yêu cầu dịch vụ', 'key' => 'service_labels'],
                ['header' => 'Giá dự kiến', 'key' => 'estimated_price', 'format' => 'currency'],
                ['header' => 'Giờ hẹn nhận', 'key' => 'estimated_pickup_time'],
                ['header' => 'Ảnh chatbot', 'key' => fn ($item) => $item->has_photos_saved ? 'Có' : 'Chưa'],
                ['header' => 'Khách đã test tại quầy', 'key' => fn ($item) => $item->inspected_at_counter ? 'Có' : 'Chưa'],
                ['header' => 'Tiền thanh toán', 'key' => 'final_amount', 'format' => 'currency'],
                ['header' => 'Trạng thái', 'key' => 'status_label'],
                ['header' => 'Ngày/giờ giao', 'key' => fn ($item) => $item->delivered_at?->format('d/m/Y H:i') ?? ''],
                ['header' => 'Người nhận thay', 'key' => 'proxy_receiver_info'],
                ['header' => 'Người nhận ký', 'key' => 'receiver_signature'],
                ['header' => 'Nhân viên giao', 'key' => 'delivery_staff_name'],
                ['header' => 'Chi nhánh', 'key' => fn ($item) => $item->branch?->name ?? ''],
                ['header' => 'Người tạo', 'key' => fn ($item) => $item->creator?->name ?? ($item->telegram_user_id ? "TG:{$item->telegram_user_id}" : 'System')],
                ['header' => 'Ghi chú', 'key' => 'notes'],
            ])
            ->fromQuery($query)
            ->download('phieu_giao_nhan_'.date('Ymd_His').'.xlsx');
    }
}

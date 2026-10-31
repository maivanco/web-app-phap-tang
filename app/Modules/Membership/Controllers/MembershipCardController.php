<?php

namespace App\Modules\Membership\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Membership\Models\MembershipCard;
use App\Modules\Membership\Models\MembershipType;
use App\Modules\Membership\Services\MembershipCardMailService;
use App\Modules\Membership\Services\MembershipQrService;
use App\Support\FormBuilder;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class MembershipCardController extends Controller
{
    public function __construct(
        protected MembershipQrService $qrService,
        protected MembershipCardMailService $mailService
    ) {}

    /**
     * Get FormBuilder schema for membership card creation/editing.
     */
    protected function getFormSchema(array $typeOptions = []): array
    {
        return FormBuilder::schema([
            'formId' => 'membership_card_form',
            'fields' => [
                [
                    'name' => 'customer_name',
                    'label' => 'Họ và tên khách hàng',
                    'type' => 'text',
                    'placeholder' => 'Nguyễn Văn A',
                    'rules' => ['required', 'string', 'max:255'],
                ],
                [
                    'name' => 'customer_phone',
                    'label' => 'Số điện thoại',
                    'type' => 'text',
                    'placeholder' => '0901234567',
                    'rules' => ['required', 'string', 'max:32'],
                ],
                [
                    'name' => 'customer_email',
                    'label' => 'Email nhận thẻ',
                    'type' => 'email',
                    'placeholder' => 'khachhang@example.com',
                    'rules' => ['required', 'email', 'max:255'],
                ],
                [
                    'name' => 'customer_dob',
                    'label' => 'Ngày sinh (không bắt buộc)',
                    'type' => 'date',
                    'rules' => ['nullable', 'date'],
                ],
                [
                    'name' => 'membership_type_id',
                    'label' => 'Gói hội viên',
                    'type' => 'select',
                    'options' => $typeOptions,
                    'rules' => ['required', 'exists:membership_types,id'],
                ],
                [
                    'name' => 'notes',
                    'label' => 'Ghi chú thêm',
                    'type' => 'textarea',
                    'placeholder' => 'Ghi chú nội bộ về hội viên này...',
                    'rules' => ['nullable', 'string', 'max:1000'],
                ],
            ],
            'rows' => [
                ['columns' => [
                    ['field' => 'customer_name', 'width' => 'w-1/2'],
                    ['field' => 'customer_phone', 'width' => 'w-1/2'],
                ]],
                ['columns' => [
                    ['field' => 'customer_email', 'width' => 'w-1/2'],
                    ['field' => 'customer_dob', 'width' => 'w-1/2'],
                ]],
                ['columns' => [['field' => 'membership_type_id', 'width' => 'w-full']]],
                ['columns' => [['field' => 'notes', 'width' => 'w-full']]],
            ],
        ]);
    }

    /**
     * Display a listing of membership cards.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', MembershipCard::class);

        $query = MembershipCard::with('membershipType')
            ->latest('id');

        if ($search = trim((string) $request->input('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhere('card_code', 'like', "%{$search}%");
            });
        }

        if ($typeId = $request->input('membership_type_id')) {
            $query->where('membership_type_id', $typeId);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $cards = $query->paginate(15)->withQueryString();
        $types = MembershipType::where('is_active', true)->get(['id', 'name', 'price']);

        return Inertia::render('Admin/Modules/Membership/Cards/Index', [
            'cards' => $cards,
            'types' => $types,
            'filters' => [
                'search' => $request->input('search', ''),
                'membership_type_id' => $request->input('membership_type_id', ''),
                'status' => $request->input('status', ''),
            ],
        ]);
    }

    /**
     * Show the form for creating a new membership card.
     */
    public function create(): Response
    {
        $this->authorize('create', MembershipCard::class);

        $types = MembershipType::where('is_active', true)
            ->orderBy('price', 'asc')
            ->get();

        $typeOptions = $types->map(fn ($t) => [
            'value' => (string) $t->id,
            'label' => $t->name.' - '.number_format($t->price, 0, ',', '.').'đ ('.$t->validity_duration.' '.$t->validity_unit.')',
        ])->toArray();

        return Inertia::render('Admin/Modules/Membership/Cards/Form', [
            'formSchema' => $this->getFormSchema($typeOptions),
            'types' => $types,
        ]);
    }

    /**
     * Store a newly created membership card in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', MembershipCard::class);

        $schema = $this->getFormSchema();
        $rules = FormBuilder::rulesForValidation($schema);

        $validated = $request->validate($rules);

        $membershipType = MembershipType::findOrFail($validated['membership_type_id']);

        $issuedAt = Carbon::now();
        $expiresAt = $membershipType->calculateExpirationDate($issuedAt);
        $cardCode = MembershipCard::generateUniqueCode();
        $benefitsSnapshot = MembershipCard::buildBenefitsSnapshot($membershipType->promotion_programs);

        $card = MembershipCard::create([
            'membership_type_id' => $membershipType->id,
            'created_by' => auth()->id(),
            'card_code' => $cardCode,
            'customer_name' => $validated['customer_name'],
            'customer_dob' => ! empty($validated['customer_dob']) ? $validated['customer_dob'] : null,
            'customer_email' => $validated['customer_email'],
            'customer_phone' => $validated['customer_phone'],
            'issued_at' => $issuedAt,
            'expires_at' => $expiresAt,
            'status' => 'active',
            'card_benefits' => $benefitsSnapshot,
            'notes' => $validated['notes'] ?? null,
        ]);

        // Generate and persist QR Code image
        try {
            $this->qrService->storeQrImage($card);
        } catch (\Throwable $e) {
            Log::error('Failed to generate QR code for card: '.$card->card_code, [
                'error' => $e->getMessage(),
            ]);
        }

        // Send Welcome Email with QR Code
        $emailNotice = '';
        try {
            $sent = $this->mailService->sendCardEmail($card);
            if ($sent) {
                $emailNotice = ' và đã gửi email mã QR thành công đến '.$card->customer_email;
            }
        } catch (\Throwable $e) {
            Log::error('Failed to send membership email: '.$e->getMessage(), [
                'card_code' => $card->card_code,
            ]);
            $emailNotice = ' (Lưu ý: Không thể gửi email ngay lúc này, quý khách có thể gửi lại sau)';
        }

        return redirect()->route('admin.membership.cards.show', $card)
            ->with('success', 'Đã cấp thẻ hội viên ['.$card->card_code.'] thành công'.$emailNotice.'.');
    }

    /**
     * Display the specified membership card.
     */
    public function show(MembershipCard $card): Response
    {
        $this->authorize('view', $card);

        $card->load([
            'membershipType',
            'createdByUser:id,name',
            'checkins.checkedInByUser:id,name',
        ]);

        $qrImageUrl = $this->qrService->getQrImageUrl($card);
        $verificationUrl = $this->qrService->getVerificationUrl($card);

        return Inertia::render('Admin/Modules/Membership/Cards/Show', [
            'card' => $card,
            'qrImageUrl' => $qrImageUrl,
            'verificationUrl' => $verificationUrl,
        ]);
    }

    /**
     * Resend membership card email.
     */
    public function resendEmail(MembershipCard $card): RedirectResponse
    {
        $this->authorize('update', $card);

        try {
            $this->mailService->sendCardEmail($card);

            return back()->with('success', 'Đã gửi lại email thẻ hội viên đến '.$card->customer_email);
        } catch (\Throwable $e) {
            return back()->with('error', 'Lỗi khi gửi email: '.$e->getMessage());
        }
    }

    /**
     * Download card QR code image.
     */
    public function downloadQr(MembershipCard $card): SymfonyResponse
    {
        $this->authorize('view', $card);

        $path = $this->qrService->storeQrImage($card);
        $fullPath = Storage::disk('public')->path($path);

        return response()->download($fullPath, 'QR-'.$card->card_code.'.png', [
            'Content-Type' => 'image/png',
        ]);
    }

    /**
     * Remove the specified membership card from storage.
     */
    public function destroy(MembershipCard $card): RedirectResponse
    {
        $this->authorize('delete', $card);

        $card->delete();

        return redirect()->route('admin.membership.cards.index')
            ->with('success', 'Đã xoá thẻ hội viên thành công.');
    }
}

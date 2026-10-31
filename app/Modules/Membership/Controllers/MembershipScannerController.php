<?php

namespace App\Modules\Membership\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Membership\Models\MembershipCard;
use App\Modules\Membership\Services\MembershipQrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MembershipScannerController extends Controller
{
    public function __construct(protected MembershipQrService $qrService) {}

    /**
     * Display the in-app camera & QR scanner page for membership cards.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Modules/Membership/Scanner/Index', [
            'initialCode' => $request->input('code', ''),
        ]);
    }

    /**
     * Extract card code from raw scanned text or URL.
     */
    protected function extractCardCode(string $input): ?string
    {
        $input = trim($input);

        // Pattern matching MEM-YYYYMMDD-XXXXX
        if (preg_match('/MEM-[A-Z0-9-]+/i', $input, $matches)) {
            return strtoupper($matches[0]);
        }

        return null;
    }

    /**
     * Lookup membership card details by scanned code, URL, or phone number.
     */
    public function lookup(Request $request): JsonResponse
    {
        $input = trim((string) $request->input('code', ''));

        if ($input === '') {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng cung cấp mã QR hoặc số điện thoại để tra cứu.',
            ], 422);
        }

        $cardCode = $this->extractCardCode($input);

        $card = null;
        if ($cardCode) {
            $card = MembershipCard::with(['membershipType', 'checkins.checkedInByUser:id,name'])
                ->where('card_code', $cardCode)
                ->first();
        }

        // If not found by card code, try looking up by phone number
        if (! $card) {
            $cleanedPhone = preg_replace('/[^0-9]/', '', $input);
            if (! empty($cleanedPhone)) {
                $card = MembershipCard::with(['membershipType', 'checkins.checkedInByUser:id,name'])
                    ->where('customer_phone', $cleanedPhone)
                    ->orWhere('customer_phone', $input)
                    ->latest('id')
                    ->first();
            }
        }

        if (! $card) {
            return response()->json([
                'success' => false,
                'message' => "Không tìm thấy thẻ hội viên với thông tin [{$input}].",
            ], 404);
        }

        return response()->json([
            'success' => true,
            'card' => [
                'id' => $card->id,
                'card_code' => $card->card_code,
                'customer_name' => $card->customer_name,
                'customer_phone' => $card->customer_phone,
                'customer_email' => $card->customer_email,
                'customer_dob' => $card->customer_dob?->format('d/m/Y'),
                'status' => $card->status,
                'is_active' => $card->isActive(),
                'is_expired' => $card->isExpired(),
                'issued_at' => $card->issued_at?->format('d/m/Y'),
                'expires_at' => $card->expires_at?->format('d/m/Y'),
                'membership_type' => [
                    'id' => $card->membershipType?->id,
                    'name' => $card->membershipType?->name,
                    'price' => $card->membershipType?->price,
                ],
                'card_benefits' => $card->card_benefits ?? [],
                'recent_checkins' => $card->checkins->take(5)->map(fn ($c) => [
                    'id' => $c->id,
                    'benefit_name' => $c->benefit_name,
                    'checked_in_at' => $c->checked_in_at?->format('d/m/Y H:i'),
                    'staff_name' => $c->checkedInByUser?->name,
                ]),
            ],
        ]);
    }

    /**
     * Direct check-in page when scanned from an external phone camera.
     */
    public function directCheckInPage(string $card_code): RedirectResponse
    {
        return redirect()->route('admin.membership.scanner.index', [
            'code' => $card_code,
        ]);
    }

    /**
     * Check in / deduct usage for a specific benefit.
     */
    public function checkIn(Request $request): JsonResponse
    {
        $cardCode = $this->extractCardCode((string) $request->input('code', ''));
        $benefitId = (string) $request->input('benefit_id', '');
        $notes = $request->input('notes');

        if (! $cardCode || ! $benefitId) {
            return response()->json([
                'success' => false,
                'message' => 'Thiếu thông tin mã thẻ hoặc ưu đãi cần check-in.',
            ], 422);
        }

        $card = MembershipCard::with('membershipType')->where('card_code', $cardCode)->first();

        if (! $card) {
            return response()->json([
                'success' => false,
                'message' => "Không tìm thấy thẻ hội viên [{$cardCode}].",
            ], 404);
        }

        [$success, $message] = $card->recordBenefitUsage($benefitId, auth()->user(), $notes);

        if (! $success) {
            return response()->json([
                'success' => false,
                'message' => $message,
            ], 422);
        }

        $card->refresh();

        return response()->json([
            'success' => true,
            'message' => $message,
            'card_benefits' => $card->card_benefits ?? [],
            'card' => [
                'id' => $card->id,
                'card_code' => $card->card_code,
                'is_active' => $card->isActive(),
                'is_expired' => $card->isExpired(),
            ],
        ]);
    }
}

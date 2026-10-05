<?php

namespace App\Modules\QrEventGenerator\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QrEventGenerator\Models\Event;
use App\Modules\QrEventGenerator\Models\EventAttendee;
use App\Modules\QrEventGenerator\Services\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QrScannerController extends Controller
{
    public function __construct(protected QrCodeService $qrCodeService)
    {
    }

    /**
     * Display the in-app camera & image QR scanner page.
     */
    public function index(Request $request): Response
    {
        $events = Event::select('id', 'name', 'status', 'event_date')
            ->whereIn('status', ['active', 'draft'])
            ->latest()
            ->get();

        return Inertia::render('Admin/Modules/QrEventGenerator/Scanner/Index', [
            'events' => $events,
        ]);
    }

    /**
     * Lookup attendee details by scanned raw text or URL.
     */
    public function lookup(Request $request): JsonResponse
    {
        $input = trim((string) $request->input('code', ''));
        $eventId = $request->input('event_id');

        $ticketCode = $this->extractTicketCode($input);

        if (!$ticketCode) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy định dạng mã vé hợp lệ trong mã QR.',
            ], 422);
        }

        $query = EventAttendee::with(['event', 'checkedInByUser:id,name'])
            ->where('ticket_code', $ticketCode);

        if (!empty($eventId)) {
            $query->where('event_id', $eventId);
        }

        $attendee = $query->first();

        if (!$attendee) {
            return response()->json([
                'success' => false,
                'message' => "Không tìm thấy vé với mã [{$ticketCode}] trong hệ thống.",
                'ticket_code' => $ticketCode,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'attendee' => [
                'id' => $attendee->id,
                'ticket_code' => $attendee->ticket_code,
                'full_name' => $attendee->full_name,
                'phone' => $attendee->phone,
                'email' => $attendee->email,
                'notes' => $attendee->notes,
                'status' => $attendee->status,
                'checked_in_at' => $attendee->checked_in_at?->format('d/m/Y H:i:s'),
                'checked_in_by_name' => $attendee->checkedInByUser?->name,
                'event' => [
                    'id' => $attendee->event->id,
                    'name' => $attendee->event->name,
                    'location' => $attendee->event->location,
                    'event_date' => $attendee->event->event_date?->format('d/m/Y H:i'),
                    'status' => $attendee->event->status,
                ],
            ],
        ]);
    }

    /**
     * Perform check-in validation and update status.
     */
    public function checkIn(Request $request): JsonResponse
    {
        $input = trim((string) $request->input('code', ''));
        $ticketCode = $this->extractTicketCode($input);

        if (!$ticketCode) {
            return response()->json([
                'success' => false,
                'message' => 'Mã vé không hợp lệ.',
            ], 422);
        }

        $attendee = EventAttendee::with(['event', 'checkedInByUser:id,name'])
            ->where('ticket_code', $ticketCode)
            ->first();

        if (!$attendee) {
            return response()->json([
                'success' => false,
                'message' => "Vé [{$ticketCode}] không tồn tại trong hệ thống.",
            ], 404);
        }

        if ($attendee->isCheckedIn()) {
            return response()->json([
                'success' => false,
                'already_checked_in' => true,
                'message' => "Vé đã được Check-in trước đó vào lúc " . ($attendee->checked_in_at?->format('H:i d/m/Y') ?? 'trước đây') . " bởi " . ($attendee->checkedInByUser?->name ?? 'nhân viên') . ".",
                'attendee' => $attendee,
            ], 409);
        }

        if ($attendee->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => "Vé này đã bị hủy bỏ và không thể check-in.",
            ], 400);
        }

        // Perform check-in
        $attendee->markAsCheckedIn($request->user()->id);
        $attendee->load(['event', 'checkedInByUser:id,name']);

        return response()->json([
            'success' => true,
            'message' => "Check-in thành công cho khách hàng {$attendee->full_name}!",
            'attendee' => [
                'id' => $attendee->id,
                'ticket_code' => $attendee->ticket_code,
                'full_name' => $attendee->full_name,
                'phone' => $attendee->phone,
                'status' => $attendee->status,
                'checked_in_at' => $attendee->checked_in_at?->format('H:i:s d/m/Y'),
                'checked_in_by_name' => $attendee->checkedInByUser?->name,
                'event_name' => $attendee->event->name,
            ],
        ]);
    }

    /**
     * Direct landing page when staff scans QR with external camera / device.
     */
    public function directCheckInPage(Request $request, string $ticket_code): Response|RedirectResponse
    {
        $attendee = EventAttendee::with(['event', 'checkedInByUser:id,name'])
            ->where('ticket_code', $ticket_code)
            ->first();

        if (!$attendee) {
            return Inertia::render('Admin/Modules/QrEventGenerator/Scanner/DirectCheckIn', [
                'notFound' => true,
                'ticketCode' => $ticket_code,
            ]);
        }

        return Inertia::render('Admin/Modules/QrEventGenerator/Scanner/DirectCheckIn', [
            'notFound' => false,
            'attendee' => [
                'id' => $attendee->id,
                'ticket_code' => $attendee->ticket_code,
                'full_name' => $attendee->full_name,
                'phone' => $attendee->phone,
                'email' => $attendee->email,
                'notes' => $attendee->notes,
                'status' => $attendee->status,
                'checked_in_at' => $attendee->checked_in_at?->format('H:i:s d/m/Y'),
                'checked_in_by_name' => $attendee->checkedInByUser?->name,
                'event' => [
                    'id' => $attendee->event->id,
                    'name' => $attendee->event->name,
                    'location' => $attendee->event->location,
                    'event_date' => $attendee->event->event_date?->format('d/m/Y H:i'),
                    'status' => $attendee->event->status,
                ],
            ],
        ]);
    }

    /**
     * Helper to parse ticket code from URL or raw string.
     */
    protected function extractTicketCode(string $input): ?string
    {
        if (empty($input)) {
            return null;
        }

        // Check if input is a URL containing /check-in/{ticket_code}
        if (preg_match('#/check-in/([A-Za-z0-9\-_]+)#i', $input, $matches)) {
            return $matches[1];
        }

        // If it starts with TK- or standard ticket string
        if (preg_match('/^[A-Za-z0-9\-_]{4,32}$/', $input)) {
            return $input;
        }

        return $input;
    }
}

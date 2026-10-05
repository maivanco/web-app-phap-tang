<?php

namespace App\Modules\QrEventGenerator\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QrEventGenerator\Models\Event;
use App\Modules\QrEventGenerator\Models\EventAttendee;
use App\Modules\QrEventGenerator\Services\QrCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EventAttendeeController extends Controller
{
    public function __construct(protected QrCodeService $qrCodeService)
    {
        $this->authorizeResource(EventAttendee::class, 'attendee');
    }

    /**
     * Store a newly created attendee for the specified event.
     */
    public function store(Request $request, Event $event): RedirectResponse
    {
        $this->authorize('create', EventAttendee::class);

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:32',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
        ]);

        $attendee = $event->attendees()->create($validated);

        return redirect()->route('admin.qr_events.show', $event)
            ->with('success', "Đã tạo mã QR vé thành công cho khách hàng {$attendee->full_name} ({$attendee->ticket_code})!");
    }

    /**
     * Update the specified attendee.
     */
    public function update(Request $request, EventAttendee $attendee): RedirectResponse
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:32',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
            'status' => 'required|in:pending,checked_in,cancelled',
        ]);

        if ($validated['status'] === 'checked_in' && $attendee->status !== 'checked_in') {
            $validated['checked_in_at'] = now();
            $validated['checked_in_by'] = $request->user()->id;
        } elseif ($validated['status'] === 'pending') {
            $validated['checked_in_at'] = null;
            $validated['checked_in_by'] = null;
        }

        $attendee->update($validated);

        return redirect()->back()
            ->with('success', 'Thông tin khách tham dự đã được cập nhật!');
    }

    /**
     * Remove the specified attendee.
     */
    public function destroy(EventAttendee $attendee): RedirectResponse
    {
        $attendee->delete();

        return redirect()->back()
            ->with('success', 'Mã vé tham dự đã được xóa!');
    }

    /**
     * Download the official Event Ticket Card (SVG).
     */
    public function downloadTicket(EventAttendee $attendee): Response
    {
        $this->authorize('view', $attendee);

        $svgContent = $this->qrCodeService->generateTicketSvg($attendee);
        $filename = 'ticket-' . $attendee->ticket_code . '.svg';

        return response($svgContent, 200, [
            'Content-Type' => 'image/svg+xml; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Stream or download the raw QR code PNG.
     */
    public function qrImage(Request $request, EventAttendee $attendee): Response
    {
        $this->authorize('view', $attendee);

        $verificationUrl = $this->qrCodeService->getVerificationUrl($attendee);
        $pngBinary = $this->qrCodeService->generateBinaryPng($verificationUrl, 12);
        $filename = 'qr-' . $attendee->ticket_code . '.png';

        $disposition = $request->boolean('download') ? 'attachment' : 'inline';

        return response($pngBinary, 200, [
            'Content-Type' => 'image/png',
            'Content-Disposition' => "{$disposition}; filename=\"{$filename}\"",
        ]);
    }
}

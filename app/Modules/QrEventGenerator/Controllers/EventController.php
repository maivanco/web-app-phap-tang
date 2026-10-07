<?php

namespace App\Modules\QrEventGenerator\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QrEventGenerator\Models\Event;
use App\Modules\QrEventGenerator\Services\QrCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    public function __construct(protected QrCodeService $qrCodeService)
    {
        $this->authorizeResource(Event::class, 'event');
    }

    /**
     * Display a listing of events.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $status = $request->input('status');

        $events = Event::with('creator:id,name')
            ->withCount([
                'attendees',
                'attendees as checked_in_count' => function ($query) {
                    $query->where('status', 'checked_in');
                },
            ])
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            })
            ->when($status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Admin/Modules/QrEventGenerator/Events/Index', [
            'events' => $events,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Show the form for creating a new event.
     */
    public function create(): Response
    {
        return Inertia::render('Admin/Modules/QrEventGenerator/Events/Create');
    }

    /**
     * Store a newly created event in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'event_date' => 'nullable|date',
            'status' => 'required|in:active,draft,completed,cancelled',
        ]);

        $validated['user_id'] = $request->user()->id;

        $event = Event::create($validated);

        return redirect()->route('admin.qr_events.show', $event)
            ->with('success', 'Sự kiện đã được tạo thành công!');
    }

    /**
     * Display the specified event with attendees.
     */
    public function show(Request $request, Event $event): Response
    {
        $search = $request->input('search');
        $status = $request->input('status');

        $attendees = $event->attendees()
            ->with('checkedInByUser:id,name')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('full_name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('ticket_code', 'like', "%{$search}%");
                });
            })
            ->when($status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->latest()
            ->paginate(20)
            ->withQueryString();

        // Attach QR data URI and server image URL for each attendee on this page
        $attendees->getCollection()->transform(function ($attendee) {
            $verificationUrl = $this->qrCodeService->getVerificationUrl($attendee);
            $attendee->qr_data_uri = $this->qrCodeService->generateDataUri($verificationUrl, 'svg');
            $attendee->qr_image_url = $this->qrCodeService->getQrImageUrl($attendee);
            $attendee->verification_url = $verificationUrl;
            return $attendee;
        });

        $stats = [
            'total' => $event->attendees()->count(),
            'checked_in' => $event->attendees()->where('status', 'checked_in')->count(),
            'pending' => $event->attendees()->where('status', 'pending')->count(),
        ];

        return Inertia::render('Admin/Modules/QrEventGenerator/Events/Show', [
            'event' => $event,
            'attendees' => $attendees,
            'stats' => $stats,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Show the form for editing the specified event.
     */
    public function edit(Event $event): Response
    {
        return Inertia::render('Admin/Modules/QrEventGenerator/Events/Edit', [
            'event' => $event,
        ]);
    }

    /**
     * Update the specified event in storage.
     */
    public function update(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'event_date' => 'nullable|date',
            'status' => 'required|in:active,draft,completed,cancelled',
        ]);

        $event->update($validated);

        return redirect()->route('admin.qr_events.show', $event)
            ->with('success', 'Thông tin sự kiện đã được cập nhật!');
    }

    /**
     * Remove the specified event from storage.
     */
    public function destroy(Event $event): RedirectResponse
    {
        $event->delete();

        return redirect()->route('admin.qr_events.index')
            ->with('success', 'Sự kiện đã được xóa thành công!');
    }
}

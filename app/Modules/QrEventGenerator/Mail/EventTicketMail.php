<?php

namespace App\Modules\QrEventGenerator\Mail;

use App\Modules\QrEventGenerator\Models\EventAttendee;
use App\Modules\QrEventGenerator\Services\QrCodeService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EventTicketMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $qrImageUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public EventAttendee $attendee,
        QrCodeService $qrCodeService
    ) {
        $this->attendee->loadMissing('event');
        $this->qrImageUrl = $qrCodeService->getQrImageUrl($attendee);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $eventName = $this->attendee->event?->name ?? 'Sự Kiện';

        return new Envelope(
            subject: "🎫 [Vé Tham Dự] {$eventName} - Mã vé: {$this->attendee->ticket_code}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.event-ticket',
            with: [
                'attendee' => $this->attendee,
                'event' => $this->attendee->event,
                'qrImageUrl' => $this->qrImageUrl,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}

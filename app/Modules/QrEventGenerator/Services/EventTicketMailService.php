<?php

namespace App\Modules\QrEventGenerator\Services;

use App\Modules\GeneralSettings\Services\BrevoService;
use App\Modules\QrEventGenerator\Mail\EventTicketMail;
use App\Modules\QrEventGenerator\Models\EventAttendee;
use Exception;
use Illuminate\Support\Facades\Mail;

class EventTicketMailService
{
    public function __construct(
        protected QrCodeService $qrCodeService,
        protected BrevoService $brevoService
    ) {}

    /**
     * Send or resend the ticket email to the attendee.
     * Reuses Brevo API if configured in General Settings, or falls back to default Laravel Mail.
     *
     * @param EventAttendee $attendee
     * @return bool True if sent, false if attendee has no email.
     * @throws \Throwable
     */
    public function sendTicketEmail(EventAttendee $attendee): bool
    {
        if (empty($attendee->email)) {
            return false;
        }

        $attendee->loadMissing('event');

        // In test environments with MailFake active, use standard Mail facade
        if (app('mailer') instanceof \Illuminate\Support\Testing\Fakes\MailFake) {
            Mail::to($attendee->email)->send(new EventTicketMail($attendee, $this->qrCodeService));

            $attendee->update([
                'is_email_sent' => true,
                'email_sent_at' => now(),
            ]);

            return true;
        }

        // If Brevo is configured, send via Brevo Transactional Email HTTP API
        if ($this->brevoService->isConfigured()) {
            $this->sendViaBrevo($attendee);
        } else {
            // Otherwise fallback to default Laravel Mail driver
            Mail::to($attendee->email)->send(new EventTicketMail($attendee, $this->qrCodeService));
        }

        $attendee->update([
            'is_email_sent' => true,
            'email_sent_at' => now(),
        ]);

        return true;
    }

    /**
     * Send ticket email using Brevo Transactional Email API.
     *
     * @throws Exception
     */
    protected function sendViaBrevo(EventAttendee $attendee): void
    {
        $verificationUrl = $this->qrCodeService->getVerificationUrl($attendee);
        $qrImageUrl = $this->qrCodeService->getQrImageUrl($attendee);
        $eventName = $attendee->event?->name ?? 'Sự Kiện';
        $subject = "🎫 [Vé Tham Dự] {$eventName} - Mã vé: {$attendee->ticket_code}";

        $htmlContent = view('emails.event-ticket', [
            'attendee' => $attendee,
            'event' => $attendee->event,
            'qrImageUrl' => $qrImageUrl,
            'verificationUrl' => $verificationUrl,
        ])->render();

        $result = $this->brevoService->sendEmail(
            recipientEmail: $attendee->email,
            subject: $subject,
            htmlContent: $htmlContent,
            recipientName: $attendee->full_name,
            attachments: []
        );

        if (!$result['success']) {
            throw new Exception($result['message']);
        }
    }
}

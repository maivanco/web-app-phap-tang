<?php

namespace App\Modules\Membership\Services;

use App\Modules\GeneralSettings\Services\BrevoService;
use App\Modules\Membership\Mail\MembershipCardMail;
use App\Modules\Membership\Models\MembershipCard;
use Exception;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Testing\Fakes\MailFake;

class MembershipCardMailService
{
    public function __construct(
        protected MembershipQrService $qrService,
        protected BrevoService $brevoService
    ) {}

    /**
     * Send or resend the membership card email to the customer.
     * Uses Brevo API if configured, otherwise falls back to default Laravel Mail.
     */
    public function sendCardEmail(MembershipCard $card): bool
    {
        if (empty($card->customer_email)) {
            return false;
        }

        $card->loadMissing('membershipType');

        // In test environments with MailFake active, use standard Mail facade
        if (app('mailer') instanceof MailFake) {
            Mail::to($card->customer_email)->send(new MembershipCardMail($card, $this->qrService));

            $card->update([
                'is_email_sent' => true,
                'email_sent_at' => now(),
            ]);

            return true;
        }

        if ($this->brevoService->isConfigured()) {
            $this->sendViaBrevo($card);
        } else {
            Mail::to($card->customer_email)->send(new MembershipCardMail($card, $this->qrService));
        }

        $card->update([
            'is_email_sent' => true,
            'email_sent_at' => now(),
        ]);

        return true;
    }

    /**
     * Send email via Brevo transactional API.
     *
     * @throws Exception
     */
    protected function sendViaBrevo(MembershipCard $card): void
    {
        $qrImageUrl = $this->qrService->getQrImageUrl($card);
        $typeName = $card->membershipType?->name ?? 'Hội Viên';
        $subject = "🪪 [Thẻ Hội Viên] Kích hoạt thành công thẻ {$typeName} - Mã thẻ: {$card->card_code}";

        $htmlContent = view('emails.membership-card', [
            'card' => $card,
            'membershipType' => $card->membershipType,
            'qrImageUrl' => $qrImageUrl,
        ])->render();

        $result = $this->brevoService->sendEmail(
            recipientEmail: $card->customer_email,
            subject: $subject,
            htmlContent: $htmlContent,
            recipientName: $card->customer_name,
            attachments: []
        );

        if (! $result['success']) {
            throw new Exception($result['message']);
        }
    }
}

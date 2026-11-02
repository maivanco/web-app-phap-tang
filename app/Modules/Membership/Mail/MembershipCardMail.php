<?php

namespace App\Modules\Membership\Mail;

use App\Modules\Membership\Models\MembershipCard;
use App\Modules\Membership\Services\MembershipQrService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class MembershipCardMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $qrImageUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public MembershipCard $card,
        MembershipQrService $qrService
    ) {
        $this->card->loadMissing('membershipType');
        $this->qrImageUrl = $qrService->getQrImageUrl($card);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $typeName = $this->card->membershipType?->name ?? 'Hội Viên';

        return new Envelope(
            subject: "🪪 [Thẻ Hội Viên] Kích hoạt thành công thẻ {$typeName} - Mã thẻ: {$this->card->card_code}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.membership-card',
            with: [
                'card' => $this->card,
                'membershipType' => $this->card->membershipType,
                'qrImageUrl' => $this->qrImageUrl,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $path = $this->card->qr_image_path ?: ('membership-qr/'.$this->card->card_code.'.png');
        if (Storage::disk('public')->exists($path)) {
            return [
                Attachment::fromStorageDisk('public', $path)
                    ->as('QR-'.$this->card->card_code.'.png')
                    ->withMime('image/png'),
            ];
        }

        return [];
    }
}

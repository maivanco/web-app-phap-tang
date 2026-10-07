<?php

namespace App\Modules\QrEventGenerator\Services;

use App\Modules\QrEventGenerator\Models\EventAttendee;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\Output\QRMarkupSVG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Support\Facades\Storage;

class QrCodeService
{
    /**
     * Get verification URL for an attendee.
     */
    public function getVerificationUrl(EventAttendee $attendee): string
    {
        return route('admin.qr_events.scanner.direct_check_in', [
            'ticket_code' => $attendee->ticket_code,
        ]);
    }

    /**
     * Store the generated QR code PNG image in the public storage disk on the server.
     *
     * @param EventAttendee $attendee
     * @param int $scale
     * @param bool $force
     * @return string Relative storage path (e.g. 'qr-codes/TK-ABC12345.png')
     */
    public function storeQrImage(EventAttendee $attendee, int $scale = 10, bool $force = false): string
    {
        $path = 'qr-codes/' . $attendee->ticket_code . '.png';

        if (!$force && Storage::disk('public')->exists($path)) {
            if ($attendee->qr_image_path !== $path) {
                $attendee->forceFill(['qr_image_path' => $path])->saveQuietly();
            }
            return $path;
        }

        $verificationUrl = $this->getVerificationUrl($attendee);
        $pngBinary = $this->generateBinaryPng($verificationUrl, $scale);

        Storage::disk('public')->put($path, $pngBinary);

        $attendee->forceFill(['qr_image_path' => $path])->saveQuietly();

        return $path;
    }

    /**
     * Get the publicly accessible HTTP URL of the stored QR image on the server.
     * Generates and stores the image on the server if not already present.
     *
     * @param EventAttendee $attendee
     * @return string Absolute URL
     */
    public function getQrImageUrl(EventAttendee $attendee): string
    {
        $path = $attendee->qr_image_path ?: ('qr-codes/' . $attendee->ticket_code . '.png');

        if (!Storage::disk('public')->exists($path)) {
            $path = $this->storeQrImage($attendee);
        }

        return url('storage/' . $path);
    }

    /**
     * Generate QR code as Base64 Data URI (SVG or PNG).
     * Defaults to SVG which requires no ext-gd extension and produces sharp vector graphics.
     */
    public function generateDataUri(string $payload, string $type = 'svg'): string
    {
        // Gracefully fallback to SVG if GD is not loaded
        if ($type === 'png' && !extension_loaded('gd')) {
            $type = 'svg';
        }

        if ($type === 'png') {
            $options = new QROptions([
                'outputInterface' => QRGdImagePNG::class,
                'outputBase64' => true,
                'scale' => 8,
                'addQuietzone' => true,
            ]);
        } else {
            $options = new QROptions([
                'outputInterface' => QRMarkupSVG::class,
                'outputBase64' => true,
                'addQuietzone' => true,
            ]);
        }

        return (new QRCode($options))->render($payload);
    }

    /**
     * Generate raw binary PNG bytes for download.
     */
    public function generateBinaryPng(string $payload, int $scale = 10): string
    {
        $options = new QROptions([
            'outputInterface' => QRGdImagePNG::class,
            'outputBase64' => false,
            'scale' => $scale,
            'addQuietzone' => true,
        ]);

        return (new QRCode($options))->render($payload);
    }

    /**
     * Generate raw SVG string.
     */
    public function generateSvg(string $payload): string
    {
        $options = new QROptions([
            'outputInterface' => QRMarkupSVG::class,
            'outputBase64' => false,
            'addQuietzone' => true,
        ]);

        return (new QRCode($options))->render($payload);
    }

    /**
     * Generate a standalone high-resolution SVG Ticket Card.
     */
    public function generateTicketSvg(EventAttendee $attendee): string
    {
        $attendee->loadMissing('event');
        $event = $attendee->event;

        $verificationUrl = $this->getVerificationUrl($attendee);
        $qrDataUri = $this->generateDataUri($verificationUrl, 'svg');

        $eventName = htmlspecialchars($event?->name ?? 'Special Event', ENT_XML1, 'UTF-8');
        $eventLocation = htmlspecialchars($event?->location ?? 'Store Location', ENT_XML1, 'UTF-8');
        $eventDate = $event?->event_date ? $event->event_date->format('d/m/Y H:i') : 'Flexible Date';
        $customerName = htmlspecialchars($attendee->full_name, ENT_XML1, 'UTF-8');
        $customerPhone = htmlspecialchars($attendee->phone, ENT_XML1, 'UTF-8');
        $ticketCode = htmlspecialchars($attendee->ticket_code, ENT_XML1, 'UTF-8');
        $statusText = strtoupper($attendee->status);

        return <<<SVG
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e1b4b" />
            <stop offset="50%" stop-color="#312e81" />
            <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#f8fafc" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#d97706" />
        </linearGradient>
        <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.35" />
        </filter>
    </defs>

    <!-- Outer Background -->
    <rect width="600" height="900" fill="url(#bgGrad)" />

    <!-- Ambient Glow Circles -->
    <circle cx="500" cy="150" r="180" fill="#6366f1" opacity="0.2" filter="blur(40px)" />
    <circle cx="100" cy="750" r="160" fill="#ec4899" opacity="0.15" filter="blur(40px)" />

    <!-- Main Ticket Card Container -->
    <g transform="translate(40, 40)" filter="url(#cardShadow)">
        <!-- Card Body -->
        <rect width="520" height="820" rx="24" fill="url(#cardGrad)" stroke="#e2e8f0" stroke-width="1.5" />

        <!-- Top Accent Bar -->
        <path d="M 0,24 Q 0,0 24,0 L 496,0 Q 520,0 520,24 L 520,120 L 0,120 Z" fill="#4338ca" />

        <!-- Header Content -->
        <text x="260" y="46" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="#a5b4fc">
            OFFICIAL EVENT PASS
        </text>
        <text x="260" y="86" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#ffffff">
            {$eventName}
        </text>

        <!-- Event Details Badge -->
        <g transform="translate(40, 140)">
            <rect width="440" height="60" rx="12" fill="#f1f5f9" />
            <text x="20" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#64748b">THỜI GIAN</text>
            <text x="20" y="46" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#1e293b">{$eventDate}</text>

            <text x="240" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#64748b">ĐỊA ĐIỂM</text>
            <text x="240" y="46" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#1e293b">{$eventLocation}</text>
        </g>

        <!-- Customer Info Section -->
        <g transform="translate(40, 225)">
            <text x="0" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="1" fill="#94a3b8">HỌ VÀ TÊN KHÁCH HÀNG</text>
            <text x="0" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="800" fill="#0f172a">{$customerName}</text>

            <text x="0" y="85" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="1" fill="#94a3b8">SỐ ĐIỆN THOẠI</text>
            <text x="0" y="112" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700" fill="#334155">{$customerPhone}</text>

            <text x="260" y="85" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="1" fill="#94a3b8">TRẠNG THÁI</text>
            <rect x="260" y="94" width="120" height="26" rx="6" fill="#ecfdf5" stroke="#10b981" stroke-width="1" />
            <text x="320" y="111" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#047857">{$statusText}</text>
        </g>

        <!-- Perforated Cut Line with notches -->
        <path d="M 0,380 L 520,380" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="8,6" />
        <circle cx="0" cy="380" r="16" fill="#1e1b4b" />
        <circle cx="520" cy="380" r="16" fill="#1e1b4b" />

        <!-- QR Code Display Box -->
        <g transform="translate(130, 415)">
            <rect width="260" height="260" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
            <image href="{$qrDataUri}" x="15" y="15" width="230" height="230" />
        </g>

        <!-- Ticket Code & Instructions -->
        <text x="260" y="715" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#6366f1">
            MÃ VÉ: {$ticketCode}
        </text>

        <text x="260" y="745" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#64748b">
            Xuất trình mã QR này tại quầy để nhân viên quét vé và check-in
        </text>

        <!-- Footer Notice -->
        <g transform="translate(0, 775)">
            <line x1="40" y1="0" x2="480" y2="0" stroke="#f1f5f9" stroke-width="1.5" />
            <text x="260" y="24" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#94a3b8">
                Hệ thống xác thực mã QR tự động • Mã vé có giá trị 1 lần sử dụng
            </text>
        </g>
    </g>
</svg>
SVG;
    }
}

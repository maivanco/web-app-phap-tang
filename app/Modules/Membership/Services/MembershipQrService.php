<?php

namespace App\Modules\Membership\Services;

use App\Modules\Membership\Models\MembershipCard;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\Output\QRMarkupSVG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Support\Facades\Storage;

class MembershipQrService
{
    /**
     * Get direct check-in / verification URL for a membership card.
     */
    public function getVerificationUrl(MembershipCard $card): string
    {
        return route('admin.membership.scanner.direct_check_in', [
            'card_code' => $card->card_code,
        ]);
    }

    /**
     * Store generated QR code PNG in public storage disk.
     */
    public function storeQrImage(MembershipCard $card, int $scale = 10, bool $force = false): string
    {
        $path = 'membership-qr/'.$card->card_code.'.png';

        if (! $force && Storage::disk('public')->exists($path)) {
            if ($card->qr_image_path !== $path) {
                $card->forceFill(['qr_image_path' => $path])->saveQuietly();
            }

            return $path;
        }

        $verificationUrl = $this->getVerificationUrl($card);
        $pngBinary = $this->generateBinaryPng($verificationUrl, $scale);

        Storage::disk('public')->put($path, $pngBinary);

        $card->forceFill(['qr_image_path' => $path])->saveQuietly();

        return $path;
    }

    /**
     * Get public URL of stored QR image.
     */
    public function getQrImageUrl(MembershipCard $card): string
    {
        $path = $card->qr_image_path ?: ('membership-qr/'.$card->card_code.'.png');

        if (! Storage::disk('public')->exists($path)) {
            $path = $this->storeQrImage($card);
        }

        return url('storage/'.$path);
    }

    /**
     * Generate QR code Data URI (SVG or PNG).
     */
    public function generateDataUri(string $payload, string $type = 'svg'): string
    {
        if ($type === 'png' && ! extension_loaded('gd')) {
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
     * Generate raw binary PNG bytes.
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
}

<?php

namespace App\Modules\GeneralSettings\Services;

use Exception;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BrevoService
{
    protected const BREVO_API_URL = 'https://api.brevo.com/v3';

    public function __construct(
        protected SettingService $settingService
    ) {}

    /**
     * Get the active Brevo API key from argument or database.
     */
    public function getApiKey(?string $explicitKey = null): ?string
    {
        if (!empty($explicitKey)) {
            return trim($explicitKey);
        }

        $saved = $this->settingService->get('brevo_api_key');

        return !empty($saved) ? trim((string) $saved) : null;
    }

    /**
     * Test connection to Brevo API and fetch account statistics.
     *
     * @return array{
     *     success: bool,
     *     message: string,
     *     data?: array{
     *         email: string,
     *         company_name: ?string,
     *         name: ?string,
     *         plan_type: string,
     *         credits: float|int|null,
     *         daily_limit: int|null,
     *         sent_today: int,
     *         remaining_today: int|null,
     *         plans: array
     *     }
     * }
     */
    public function testConnection(?string $apiKey = null): array
    {
        $key = $this->getApiKey($apiKey);

        if (empty($key)) {
            return [
                'success' => false,
                'message' => 'Brevo API key is missing. Please provide or save a valid API key.',
            ];
        }

        try {
            // 1. Fetch Account Information
            $response = Http::withHeaders([
                'api-key' => $key,
                'accept' => 'application/json',
            ])->timeout(12)->get(self::BREVO_API_URL . '/account');

            if ($response->status() === 401) {
                return [
                    'success' => false,
                    'message' => 'Invalid Brevo API key. Authentication failed (401 Unauthorized).',
                ];
            }

            if ($response->status() === 403) {
                return [
                    'success' => false,
                    'message' => 'Access denied by Brevo (403 Forbidden). Check API key permissions.',
                ];
            }

            if (!$response->successful()) {
                $err = $response->json('message') ?? 'HTTP status ' . $response->status();

                return [
                    'success' => false,
                    'message' => 'Failed to connect to Brevo: ' . $err,
                ];
            }

            $accountData = $response->json();

            // 2. Fetch Today's Sending Activity
            $today = Carbon::now()->format('Y-m-d');
            $statsResponse = Http::withHeaders([
                'api-key' => $key,
                'accept' => 'application/json',
            ])->timeout(10)->get(self::BREVO_API_URL . '/smtp/statistics/reports', [
                'startDate' => $today,
                'endDate' => $today,
            ]);

            $sentToday = 0;
            if ($statsResponse->successful()) {
                $reports = $statsResponse->json('reports') ?? [];
                if (!empty($reports) && is_array($reports)) {
                    $sentToday = (int) ($reports[0]['requests'] ?? $reports[0]['delivered'] ?? 0);
                }
            }

            // 3. Parse Plan and Quota
            $plans = $accountData['plan'] ?? [];
            $primaryPlanType = 'Free';
            $credits = null;
            $dailyLimit = 300; // Brevo Free plan default daily sending limit

            if (!empty($plans) && is_array($plans)) {
                foreach ($plans as $p) {
                    $pType = strtolower($p['type'] ?? '');
                    if ($pType === 'subscription' || $pType === 'monthly') {
                        $primaryPlanType = 'Subscription / Monthly';
                        $credits = $p['credits'] ?? $credits;
                        // On paid plans, daily limit is effectively unconstrained by daily cap (subject to monthly quota)
                        $dailyLimit = null;
                    } elseif ($pType === 'payasyougo' || $pType === 'credits') {
                        $primaryPlanType = 'Pay As You Go';
                        $credits = $p['credits'] ?? $credits;
                        $dailyLimit = null;
                    } elseif ($pType === 'free') {
                        $primaryPlanType = 'Free Plan';
                        $credits = $p['credits'] ?? 300;
                        $dailyLimit = 300;
                    }
                }
            }

            $remainingToday = null;
            if ($dailyLimit !== null) {
                $remainingToday = max(0, $dailyLimit - $sentToday);
            } elseif ($credits !== null) {
                $remainingToday = max(0, (int) $credits - $sentToday);
            }

            $fullName = trim(($accountData['firstName'] ?? '') . ' ' . ($accountData['lastName'] ?? ''));

            // 4. Fetch Verified Senders
            $senders = $this->getVerifiedSenders($key);

            return [
                'success' => true,
                'message' => 'Successfully connected to Brevo API.',
                'data' => [
                    'email' => $accountData['email'] ?? '',
                    'company_name' => $accountData['companyName'] ?? null,
                    'name' => !empty($fullName) ? $fullName : null,
                    'plan_type' => $primaryPlanType,
                    'credits' => $credits,
                    'daily_limit' => $dailyLimit,
                    'sent_today' => $sentToday,
                    'remaining_today' => $remainingToday,
                    'plans' => $plans,
                    'senders' => $senders,
                ],
            ];
        } catch (Exception $e) {
            Log::error('Brevo API connection error: ' . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Connection to Brevo failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Fetch list of verified senders configured in the Brevo account.
     *
     * @return array<int, array{id: int, name: string, email: string, active: bool}>
     */
    public function getVerifiedSenders(?string $apiKey = null): array
    {
        $key = $this->getApiKey($apiKey);
        if (empty($key)) {
            return [];
        }

        try {
            $response = Http::withHeaders([
                'api-key' => $key,
                'accept' => 'application/json',
            ])->timeout(10)->get(self::BREVO_API_URL . '/senders');

            if ($response->successful()) {
                return (array) ($response->json('senders') ?? []);
            }
        } catch (Exception $e) {
            Log::warning('Failed to fetch Brevo senders: ' . $e->getMessage());
        }

        return [];
    }

    /**
     * Send a test email via Brevo transactional SMTP API.
     */
    public function sendTestEmail(string $recipientEmail, ?string $apiKey = null): array
    {
        $key = $this->getApiKey($apiKey);

        if (empty($key)) {
            return [
                'success' => false,
                'message' => 'Brevo API key is not configured.',
            ];
        }

        $senderName = (string) ($this->settingService->get('mail_from_name') ?: '');
        $senderEmail = (string) ($this->settingService->get('mail_from_address') ?: '');

        // If sender email is not set, try to use first active verified sender from Brevo
        $verifiedSenders = $this->getVerifiedSenders($key);
        if (empty($senderEmail) && !empty($verifiedSenders)) {
            $primarySender = $verifiedSenders[0];
            $senderEmail = $primarySender['email'] ?? '';
            if (empty($senderName)) {
                $senderName = $primarySender['name'] ?? config('app.name', 'Pháp Tạng');
            }
        }

        if (empty($senderEmail)) {
            $senderEmail = config('mail.from.address', 'noreply@phaptang.com');
        }
        if (empty($senderName)) {
            $senderName = config('app.name', 'Pháp Tạng');
        }

        try {
            $response = Http::withHeaders([
                'api-key' => $key,
                'accept' => 'application/json',
                'content-type' => 'application/json',
            ])->timeout(15)->post(self::BREVO_API_URL . '/smtp/email', [
                'sender' => [
                    'name' => $senderName,
                    'email' => $senderEmail,
                ],
                'to' => [
                    [
                        'email' => $recipientEmail,
                    ],
                ],
                'subject' => 'Kiểm tra cấu hình Email - ' . config('app.name', 'Pháp Tạng'),
                'htmlContent' => '
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #d97706; margin-bottom: 8px;">Pháp Tạng - Email Test</h2>
                        <p style="color: #334155; font-size: 15px;">Chúc mừng! Hệ thống gửi email qua Brevo API đã được kết nối và hoạt động chính xác.</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                        <p style="color: #64748b; font-size: 13px;">Thời gian gửi: ' . Carbon::now()->toDateTimeString() . '</p>
                        <p style="color: #64748b; font-size: 13px;">Người gửi: ' . htmlspecialchars($senderName) . ' &lt;' . htmlspecialchars($senderEmail) . '&gt;</p>
                    </div>
                ',
            ]);

            if (!$response->successful()) {
                $err = $response->json('message') ?? 'HTTP status ' . $response->status();

                return [
                    'success' => false,
                    'message' => 'Brevo error: ' . $err,
                ];
            }

            return [
                'success' => true,
                'message' => 'Test email sent successfully to ' . $recipientEmail . ' (Message ID: ' . ($response->json('messageId') ?? 'N/A') . ').',
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to send test email: ' . $e->getMessage(),
            ];
        }
    }
}

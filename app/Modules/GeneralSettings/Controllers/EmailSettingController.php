<?php

namespace App\Modules\GeneralSettings\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\GeneralSettings\Models\Setting;
use App\Modules\GeneralSettings\Services\BrevoService;
use App\Modules\GeneralSettings\Services\SettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailSettingController extends Controller
{
    public function __construct(
        protected SettingService $settingService,
        protected BrevoService $brevoService
    ) {}

    /**
     * Display Email Settings configuration page.
     */
    public function index(): Response
    {
        $this->authorize('viewAny', Setting::class);

        $savedApiKey = (string) ($this->settingService->get('brevo_api_key') ?? '');
        $mailFromName = (string) ($this->settingService->get('mail_from_name') ?? config('app.name', 'Pháp Tạng'));
        $mailFromAddress = (string) ($this->settingService->get('mail_from_address') ?? config('mail.from.address', ''));

        // If an API key is already configured, attempt to load live connection status & stats
        $liveStats = null;
        if (!empty($savedApiKey)) {
            $liveStats = $this->brevoService->testConnection($savedApiKey);
        }

        return Inertia::render('Admin/Modules/GeneralSettings/EmailSettings', [
            'settings' => [
                'brevo_api_key' => $savedApiKey,
                'has_api_key' => !empty($savedApiKey),
                'mail_from_name' => $mailFromName,
                'mail_from_address' => $mailFromAddress,
            ],
            'liveStats' => $liveStats,
        ]);
    }

    /**
     * Update Email settings.
     */
    public function update(Request $request): RedirectResponse
    {
        $this->authorize('update', Setting::class);

        $validated = $request->validate([
            'brevo_api_key' => ['nullable', 'string', 'max:500'],
            'mail_from_name' => ['nullable', 'string', 'max:120'],
            'mail_from_address' => ['nullable', 'email', 'max:191'],
        ]);

        $this->settingService->set(
            name: 'brevo_api_key',
            value: $validated['brevo_api_key'] ?? null,
            group: 'email',
            autoload: false,
            description: 'Brevo API Key for sending transactional emails',
            isSecret: true
        );

        $this->settingService->set(
            name: 'mail_from_name',
            value: $validated['mail_from_name'] ?? null,
            group: 'email',
            autoload: true,
            description: 'Default Sender Name for outgoing emails'
        );

        $this->settingService->set(
            name: 'mail_from_address',
            value: $validated['mail_from_address'] ?? null,
            group: 'email',
            autoload: true,
            description: 'Default Sender Email Address'
        );

        return redirect()
            ->route('admin.general_settings.email')
            ->with('success', 'Email settings updated successfully.');
    }

    /**
     * Test Brevo API Connection.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Setting::class);

        $apiKey = $request->input('brevo_api_key');
        $result = $this->brevoService->testConnection($apiKey);

        return response()->json($result);
    }

    /**
     * Send a test email to verify transactional delivery.
     */
    public function sendTestEmail(Request $request): JsonResponse
    {
        $this->authorize('update', Setting::class);

        $request->validate([
            'recipient_email' => ['required', 'email'],
            'brevo_api_key' => ['nullable', 'string'],
        ]);

        $recipientEmail = $request->input('recipient_email');
        $apiKey = $request->input('brevo_api_key');

        $result = $this->brevoService->sendTestEmail($recipientEmail, $apiKey);

        return response()->json($result);
    }
}

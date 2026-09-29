<?php

namespace App\Modules\CashFlow\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CashFlow\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function __construct(
        protected TelegramBotService $botService
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $update = $request->all();

        // Log incoming update payload for debugging
        Log::info('Telegram update received: ', ['update_id' => $update['update_id'] ?? null]);

        try {
            $this->botService->handleUpdate($update);
        } catch (\Throwable $e) {
            Log::error('Telegram webhook handling error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
        }

        // Always return 200 OK to Telegram
        return response()->json(['ok' => true]);
    }
}

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TelegramSetWebhookCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'telegram:set-webhook {url? : The public HTTPS webhook URL}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Set or check the Telegram Bot webhook URL';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $botToken = config('services.telegram.bot_token', env('TELEGRAM_BOT_TOKEN'));

        if (!$botToken) {
            $this->error('TELEGRAM_BOT_TOKEN is not set in your .env file.');
            return 1;
        }

        $url = $this->argument('url');

        if (!$url) {
            // Check current webhook status
            $this->info("Checking current webhook info...");
            $res = Http::get("https://api.telegram.org/bot{$botToken}/getWebhookInfo");
            $this->line(json_encode($res->json(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            return 0;
        }

        $this->info("Setting webhook to: {$url}...");
        $res = Http::post("https://api.telegram.org/bot{$botToken}/setWebhook", [
            'url' => $url,
            'drop_pending_updates' => false,
        ]);

        if ($res->successful()) {
            $this->info("✅ Webhook set successfully!");
            $this->line(json_encode($res->json(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            return 0;
        }

        $this->error("❌ Failed to set webhook:");
        $this->line($res->body());
        return 1;
    }
}

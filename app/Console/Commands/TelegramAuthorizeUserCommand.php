<?php

namespace App\Console\Commands;

use App\Modules\CashFlow\Models\TelegramAuthorizedUser;
use Illuminate\Console\Command;

class TelegramAuthorizeUserCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'telegram:authorize-user 
                            {id : Telegram User ID (numeric, e.g. 7377920297)} 
                            {name? : Full name of the user} 
                            {--role=manager : Role of the user (manager or seller)}
                            {--deactivate : Deactivate the user instead of activating}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Authorize, update, or deactivate a Telegram user for the CashFlow bot';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $telegramId = (int) $this->argument('id');

        if ($telegramId <= 0) {
            $this->error('Invalid Telegram user ID. Must be a positive integer.');
            return 1;
        }

        $existing = TelegramAuthorizedUser::where('telegram_user_id', $telegramId)->first();
        $name = $this->argument('name') ?: ($existing ? $existing->full_name : 'User ' . $telegramId);
        $role = $this->option('role') ?: ($existing ? $existing->role : 'manager');
        $isActive = !$this->option('deactivate');

        $user = TelegramAuthorizedUser::updateOrCreate(
            ['telegram_user_id' => $telegramId],
            [
                'full_name' => $name,
                'role' => $role,
                'is_active' => $isActive,
            ]
        );

        $statusText = $isActive ? 'ACTIVATED' : 'DEACTIVATED';
        $this->info("✅ Successfully {$statusText} user:");
        $this->table(
            ['Telegram ID', 'Full Name', 'Role', 'Status'],
            [[$user->telegram_user_id, $user->full_name, $user->role, $isActive ? 'Active' : 'Inactive']]
        );

        return 0;
    }
}

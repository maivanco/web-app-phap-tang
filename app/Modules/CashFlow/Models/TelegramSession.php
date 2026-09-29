<?php

namespace App\Modules\CashFlow\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'telegram_chat_id',
        'telegram_user_id',
        'username',
        'current_mode', // order, expense
        'current_step',
        'selected_branch_id',
        'draft_data',
        'last_message_id',
    ];

    protected $casts = [
        'current_step' => 'integer',
        'draft_data' => 'array',
    ];

    public function selectedBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'selected_branch_id');
    }
}

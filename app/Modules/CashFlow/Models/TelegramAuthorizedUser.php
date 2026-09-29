<?php

namespace App\Modules\CashFlow\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TelegramAuthorizedUser extends Model
{
    use HasFactory;

    protected $fillable = [
        'telegram_user_id',
        'full_name',
        'role', // seller, manager, admin
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}

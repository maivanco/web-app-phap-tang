<?php

namespace App\Modules\CashFlow\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class TransactionAudit extends Model
{
    use HasFactory;

    protected $fillable = [
        'auditable_type',
        'auditable_id',
        'action', // update, cancel
        'version',
        'reason',
        'before_payload',
        'after_payload',
        'user_id',
        'telegram_user_id',
    ];

    protected $casts = [
        'version' => 'integer',
        'before_payload' => 'array',
        'after_payload' => 'array',
    ];

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

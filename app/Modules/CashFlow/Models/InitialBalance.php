<?php

namespace App\Modules\CashFlow\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InitialBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_id',
        'effective_date',
        'initial_amount',
        'note',
        'created_by',
    ];

    protected $casts = [
        'effective_date' => 'date',
        'initial_amount' => 'decimal:2',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(FinancialAccount::class, 'account_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

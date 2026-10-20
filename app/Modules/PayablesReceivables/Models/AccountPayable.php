<?php

namespace App\Modules\PayablesReceivables\Models;

use App\Models\User;
use App\Modules\CashFlow\Models\FinancialAccount;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AccountPayable extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'account_payables';

    protected $fillable = [
        'supplier_name',
        'description',
        'amount',
        'due_date',
        'status',
        'paid_at',
        'paid_notes',
        'paid_account_id',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'paid_at' => 'date',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function paidAccount(): BelongsTo
    {
        return $this->belongsTo(FinancialAccount::class, 'paid_account_id');
    }

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->where('status', 'unpaid');
    }

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('status', 'paid');
    }
}

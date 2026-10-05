<?php

namespace App\Modules\CashFlow\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinancialAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'letter_code',
        'name',
        'type', // cash, bank, card_gateway
        'branch_id',
        'status',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function initialBalances(): HasMany
    {
        return $this->hasMany(InitialBalance::class, 'account_id');
    }

    public function latestInitialBalance(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(InitialBalance::class, 'account_id')->latestOfMany('effective_date');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(OrderPayment::class, 'account_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'account_id');
    }

    public function transfersOut(): HasMany
    {
        return $this->hasMany(InternalTransfer::class, 'from_account_id');
    }

    public function transfersIn(): HasMany
    {
        return $this->hasMany(InternalTransfer::class, 'to_account_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(\App\Models\User::class, 'financial_account_id');
    }

    public function dailyBalances(): HasMany
    {
        return $this->hasMany(DailyStaffBalance::class, 'account_id');
    }
}

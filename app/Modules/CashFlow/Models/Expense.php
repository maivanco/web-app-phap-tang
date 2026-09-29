<?php

namespace App\Modules\CashFlow\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'expense_code',
        'expense_date',
        'branch_id',
        'spender_name',
        'content',
        'quantity',
        'unit_price',
        'total_amount',
        'method', // cash, bank_transfer
        'account_id',
        'note',
        'status',
        'version',
        'created_by',
        'telegram_user_id',
    ];

    protected $casts = [
        'expense_date' => 'date',
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'version' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(FinancialAccount::class, 'account_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function audits(): MorphMany
    {
        return $this->morphMany(TransactionAudit::class, 'auditable')->orderByDesc('version');
    }
}

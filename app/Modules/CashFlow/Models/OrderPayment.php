<?php

namespace App\Modules\CashFlow\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'method', // cash, bank_transfer, card_swipe
        'account_id',
        'amount',
        'payment_date',
        'card_swipe_date',
        'card_settlement_date',
        'card_settlement_account_id',
        'actual_received_amount',
        'fee_amount',
        'status', // completed, pending_settlement, reconciled
        'settled_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'actual_received_amount' => 'decimal:2',
        'fee_amount' => 'decimal:2',
        'payment_date' => 'date',
        'card_swipe_date' => 'date',
        'card_settlement_date' => 'date',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(FinancialAccount::class, 'account_id');
    }

    public function settlementAccount(): BelongsTo
    {
        return $this->belongsTo(FinancialAccount::class, 'card_settlement_account_id');
    }

    public function settledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'settled_by');
    }
}

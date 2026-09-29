<?php

namespace App\Modules\CashFlow\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_code',
        'sale_date',
        'branch_id',
        'consultant_name',
        'customer_name',
        'customer_phone',
        'customer_gender',
        'customer_source_id',
        'discount_code',
        'discount_rate',
        'gross_amount',
        'discount_amount',
        'net_revenue',
        'note',
        'status',
        'version',
        'created_by',
        'telegram_user_id',
    ];

    protected $casts = [
        'sale_date' => 'date',
        'discount_rate' => 'decimal:4',
        'gross_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'net_revenue' => 'decimal:2',
        'version' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customerSource(): BelongsTo
    {
        return $this->belongsTo(CustomerSource::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class)->orderBy('line_number');
    }

    public function payment(): HasOne
    {
        return $this->hasOne(OrderPayment::class);
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

<?php

namespace App\Modules\CashFlow\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'line_number',
        'product_name',
        'brand_id',
        'quantity',
        'unit_price',
        'gross_amount',
        'allocated_discount',
        'net_amount',
    ];

    protected $casts = [
        'line_number' => 'integer',
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'gross_amount' => 'decimal:2',
        'allocated_discount' => 'decimal:2',
        'net_amount' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }
}

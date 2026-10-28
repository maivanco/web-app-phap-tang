<?php

namespace App\Modules\ReceiptNotes\Models;

use App\Models\User;
use App\Modules\CashFlow\Models\Branch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReceiptNote extends Model
{
    use HasFactory;

    protected $table = 'receipt_notes';

    protected $fillable = [
        'note_code',
        'received_date',
        'appointment_date',
        'customer_name',
        'customer_phone',
        'service_types',
        'other_service_description',
        'estimated_price',
        'estimated_pickup_time',
        'has_photos_saved',
        'inspected_at_counter',
        'final_amount',
        'status',
        'delivered_at',
        'proxy_receiver_info',
        'receiver_signature',
        'delivery_staff_name',
        'branch_id',
        'created_by',
        'telegram_user_id',
        'notes',
    ];

    protected $casts = [
        'received_date' => 'date',
        'appointment_date' => 'date',
        'delivered_at' => 'datetime',
        'service_types' => 'array',
        'has_photos_saved' => 'boolean',
        'inspected_at_counter' => 'boolean',
        'estimated_price' => 'float',
        'final_amount' => 'float',
    ];

    /**
     * Map of known service codes to human-readable Vietnamese labels.
     */
    public const SERVICE_MAP = [
        'thay_day' => 'Thay dây',
        'that_lai' => 'Thắt lại',
        'chinh_size' => 'Chỉnh size',
        'khac' => 'Khác',
    ];

    /**
     * Map of statuses to human-readable labels.
     */
    public const STATUS_MAP = [
        'chua_giao' => 'Chưa giao',
        'da_giao' => 'Đã giao',
        'da_huy' => 'Đã hủy',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get formatted string of selected services.
     */
    public function getServiceLabelsAttribute(): string
    {
        $types = $this->service_types ?: [];
        $labels = [];

        foreach ($types as $type) {
            if ($type === 'khac' && ! empty($this->other_service_description)) {
                $labels[] = 'Khác: '.$this->other_service_description;
            } else {
                $labels[] = self::SERVICE_MAP[$type] ?? $type;
            }
        }

        if (empty($labels) && ! empty($this->other_service_description)) {
            $labels[] = 'Khác: '.$this->other_service_description;
        }

        return implode(', ', $labels);
    }

    /**
     * Get human-readable status label.
     */
    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_MAP[$this->status] ?? $this->status;
    }
}

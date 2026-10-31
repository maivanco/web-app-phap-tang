<?php

namespace App\Modules\Membership\Models;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class MembershipCard extends Model
{
    use HasFactory;

    protected $table = 'membership_cards';

    protected $fillable = [
        'membership_type_id',
        'created_by',
        'card_code',
        'customer_name',
        'customer_dob',
        'customer_email',
        'customer_phone',
        'issued_at',
        'expires_at',
        'status',
        'card_benefits',
        'qr_image_path',
        'is_email_sent',
        'email_sent_at',
        'notes',
    ];

    protected $casts = [
        'customer_dob' => 'date',
        'issued_at' => 'datetime',
        'expires_at' => 'datetime',
        'card_benefits' => 'array',
        'is_email_sent' => 'boolean',
        'email_sent_at' => 'datetime',
    ];

    public function membershipType(): BelongsTo
    {
        return $this->belongsTo(MembershipType::class, 'membership_type_id');
    }

    public function checkins(): HasMany
    {
        return $this->hasMany(MembershipCardCheckin::class, 'membership_card_id')->latest('checked_in_at');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if the membership card is currently active and unexpired.
     */
    public function isActive(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        return Carbon::now()->lte($this->expires_at);
    }

    /**
     * Check if the membership card is expired.
     */
    public function isExpired(): bool
    {
        return Carbon::now()->gt($this->expires_at);
    }

    /**
     * Generate a unique card code (e.g. MEM-20261031-A1B2C).
     */
    public static function generateUniqueCode(): string
    {
        do {
            $code = 'MEM-'.date('Ymd').'-'.strtoupper(Str::random(5));
        } while (static::where('card_code', $code)->exists());

        return $code;
    }

    /**
     * Initialize benefits snapshot from membership type.
     */
    public static function buildBenefitsSnapshot(?array $promotionPrograms): array
    {
        if (empty($promotionPrograms)) {
            return [];
        }

        $benefits = [];
        foreach ($promotionPrograms as $index => $prog) {
            $count = isset($prog['usage_count']) ? (int) $prog['usage_count'] : 0;
            $benefits[] = [
                'id' => $prog['id'] ?? ('prog_'.($index + 1).'_'.Str::random(4)),
                'name' => trim((string) ($prog['name'] ?? '')),
                'usage_count' => $count,
                'used_count' => 0,
                'remaining_count' => $count,
            ];
        }

        return $benefits;
    }

    /**
     * Record usage for a specific benefit.
     *
     * @return array [bool $success, string $message]
     */
    public function recordBenefitUsage(string $benefitId, ?User $user = null, ?string $notes = null): array
    {
        if (! $this->isActive()) {
            return [false, 'Thẻ hội viên đã hết hạn hoặc không ở trạng thái kích hoạt.'];
        }

        $benefits = $this->card_benefits ?? [];
        $foundIndex = null;

        foreach ($benefits as $index => $benefit) {
            if (($benefit['id'] ?? '') === $benefitId) {
                $foundIndex = $index;
                break;
            }
        }

        if ($foundIndex === null) {
            return [false, 'Không tìm thấy ưu đãi tương ứng trong thẻ hội viên.'];
        }

        $target = $benefits[$foundIndex];
        $usageCount = (int) ($target['usage_count'] ?? 0);
        $usedCount = (int) ($target['used_count'] ?? 0);
        $remainingCount = (int) ($target['remaining_count'] ?? 0);

        // If usage_count > 0, it is limited
        if ($usageCount > 0) {
            if ($remainingCount <= 0) {
                return [false, "Ưu đãi [{$target['name']}] đã hết lượt sử dụng."];
            }
            $target['used_count'] = $usedCount + 1;
            $target['remaining_count'] = max(0, $remainingCount - 1);
        } else {
            // Unlimited usage
            $target['used_count'] = $usedCount + 1;
        }

        $benefits[$foundIndex] = $target;
        $this->card_benefits = $benefits;
        $this->save();

        $this->checkins()->create([
            'checked_in_by' => $user?->id,
            'benefit_id' => $target['id'],
            'benefit_name' => $target['name'],
            'notes' => $notes,
            'checked_in_at' => Carbon::now(),
        ]);

        return [true, "Đã ghi nhận sử dụng 1 lượt cho ưu đãi: {$target['name']}"];
    }
}

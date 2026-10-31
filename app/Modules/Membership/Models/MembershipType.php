<?php

namespace App\Modules\Membership\Models;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MembershipType extends Model
{
    use HasFactory;

    protected $table = 'membership_types';

    protected $fillable = [
        'created_by',
        'name',
        'code',
        'description',
        'price',
        'validity_duration',
        'validity_unit',
        'promotion_programs',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'validity_duration' => 'integer',
        'promotion_programs' => 'array',
        'is_active' => 'boolean',
    ];

    public function cards(): HasMany
    {
        return $this->hasMany(MembershipCard::class, 'membership_type_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Calculate card expiration date based on validity configuration.
     */
    public function calculateExpirationDate(?Carbon $startDate = null): Carbon
    {
        $base = $startDate ? $startDate->copy() : Carbon::now();
        $duration = max(1, (int) $this->validity_duration);

        return match ($this->validity_unit) {
            'day', 'days' => $base->addDays($duration),
            'year', 'years' => $base->addYears($duration),
            default => $base->addMonths($duration),
        };
    }
}

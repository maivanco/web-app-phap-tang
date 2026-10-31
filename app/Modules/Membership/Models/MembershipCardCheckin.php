<?php

namespace App\Modules\Membership\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MembershipCardCheckin extends Model
{
    use HasFactory;

    protected $table = 'membership_card_checkins';

    protected $fillable = [
        'membership_card_id',
        'checked_in_by',
        'benefit_id',
        'benefit_name',
        'notes',
        'checked_in_at',
    ];

    protected $casts = [
        'checked_in_at' => 'datetime',
    ];

    public function card(): BelongsTo
    {
        return $this->belongsTo(MembershipCard::class, 'membership_card_id');
    }

    public function checkedInByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }
}

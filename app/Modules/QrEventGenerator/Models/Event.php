<?php

namespace App\Modules\QrEventGenerator\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    use HasFactory;

    protected $table = 'qr_events';

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'location',
        'event_date',
        'status',
    ];

    protected $casts = [
        'event_date' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(EventAttendee::class, 'event_id');
    }

    public function getAttendeeCountAttribute(): int
    {
        return $this->attendees()->count();
    }

    public function getCheckedInCountAttribute(): int
    {
        return $this->attendees()->where('status', 'checked_in')->count();
    }
}

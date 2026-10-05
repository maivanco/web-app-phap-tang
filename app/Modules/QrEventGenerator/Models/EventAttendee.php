<?php

namespace App\Modules\QrEventGenerator\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class EventAttendee extends Model
{
    use HasFactory;

    protected $table = 'qr_event_attendees';

    protected $fillable = [
        'event_id',
        'ticket_code',
        'full_name',
        'phone',
        'email',
        'notes',
        'status',
        'checked_in_at',
        'checked_in_by',
    ];

    protected $casts = [
        'checked_in_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (EventAttendee $attendee) {
            if (empty($attendee->ticket_code)) {
                $attendee->ticket_code = self::generateUniqueTicketCode();
            }
        });
    }

    public static function generateUniqueTicketCode(): string
    {
        do {
            $code = 'TK-' . strtoupper(Str::random(8));
        } while (self::where('ticket_code', $code)->exists());

        return $code;
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function checkedInByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function isCheckedIn(): bool
    {
        return $this->status === 'checked_in';
    }

    public function markAsCheckedIn(int $userId): bool
    {
        $this->status = 'checked_in';
        $this->checked_in_at = now();
        $this->checked_in_by = $userId;
        return $this->save();
    }
}

<?php

namespace App\Modules\QrEventGenerator\Policies;

use App\Models\User;
use App\Modules\QrEventGenerator\Models\EventAttendee;
use Illuminate\Auth\Access\HandlesAuthorization;

class EventAttendeePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, EventAttendee $attendee): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, EventAttendee $attendee): bool
    {
        return true;
    }

    public function delete(User $user, EventAttendee $attendee): bool
    {
        return $user->isManager();
    }
}

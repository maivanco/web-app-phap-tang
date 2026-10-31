<?php

namespace App\Modules\Membership\Policies;

use App\Models\User;
use App\Modules\Membership\Models\MembershipCard;
use Illuminate\Auth\Access\HandlesAuthorization;

class MembershipCardPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, MembershipCard $card): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, MembershipCard $card): bool
    {
        return true;
    }

    public function delete(User $user, MembershipCard $card): bool
    {
        return $user->isManager();
    }
}

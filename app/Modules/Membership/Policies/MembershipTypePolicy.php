<?php

namespace App\Modules\Membership\Policies;

use App\Models\User;
use App\Modules\Membership\Models\MembershipType;
use Illuminate\Auth\Access\HandlesAuthorization;

class MembershipTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, MembershipType $membershipType): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, MembershipType $membershipType): bool
    {
        return true;
    }

    public function delete(User $user, MembershipType $membershipType): bool
    {
        return $user->isManager();
    }
}

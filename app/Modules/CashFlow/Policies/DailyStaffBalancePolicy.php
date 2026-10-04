<?php

namespace App\Modules\CashFlow\Policies;

use App\Models\User;
use App\Modules\CashFlow\Models\DailyStaffBalance;
use Illuminate\Auth\Access\HandlesAuthorization;

class DailyStaffBalancePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, DailyStaffBalance $balance): bool
    {
        return $user->isManager() || $user->id === $balance->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, DailyStaffBalance $balance): bool
    {
        return $user->isManager() || $user->id === $balance->user_id;
    }

    public function delete(User $user, DailyStaffBalance $balance): bool
    {
        return $user->isManager();
    }
}

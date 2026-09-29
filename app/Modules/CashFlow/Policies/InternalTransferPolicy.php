<?php

namespace App\Modules\CashFlow\Policies;

use App\Models\User;
use App\Modules\CashFlow\Models\InternalTransfer;
use Illuminate\Auth\Access\HandlesAuthorization;

class InternalTransferPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->isManager();
    }

    public function view(User $user, InternalTransfer $transfer): bool
    {
        return $user->isManager();
    }

    public function create(User $user): bool
    {
        return $user->isManager();
    }
}

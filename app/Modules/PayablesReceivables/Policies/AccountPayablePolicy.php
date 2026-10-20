<?php

namespace App\Modules\PayablesReceivables\Policies;

use App\Models\User;
use App\Modules\PayablesReceivables\Models\AccountPayable;
use Illuminate\Auth\Access\HandlesAuthorization;

class AccountPayablePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, AccountPayable $payable): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, AccountPayable $payable): bool
    {
        return true;
    }

    public function delete(User $user, AccountPayable $payable): bool
    {
        return $user->isManager();
    }
}

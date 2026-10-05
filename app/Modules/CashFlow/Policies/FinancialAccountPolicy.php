<?php

namespace App\Modules\CashFlow\Policies;

use App\Models\User;
use App\Modules\CashFlow\Models\FinancialAccount;
use Illuminate\Auth\Access\HandlesAuthorization;

class FinancialAccountPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isManager() || $user->isAdmin();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, FinancialAccount $financialAccount): bool
    {
        return $user->isManager() || $user->isAdmin();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isManager() || $user->isAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, FinancialAccount $financialAccount): bool
    {
        return $user->isManager() || $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, FinancialAccount $financialAccount): bool
    {
        return $user->isManager() || $user->isAdmin();
    }
}

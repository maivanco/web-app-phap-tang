<?php

namespace App\Modules\CashFlow\Policies;

use App\Models\User;
use App\Modules\CashFlow\Models\Expense;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExpensePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Expense $expense): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Expense $expense): bool
    {
        return $user->isManager();
    }

    public function delete(User $user, Expense $expense): bool
    {
        return $user->isManager();
    }
}

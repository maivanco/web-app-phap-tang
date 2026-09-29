<?php

namespace App\Modules\CashFlow\Policies;

use App\Models\User;
use App\Modules\CashFlow\Models\Order;
use Illuminate\Auth\Access\HandlesAuthorization;

class OrderPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Order $order): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Order $order): bool
    {
        return $user->isManager();
    }

    public function delete(User $user, Order $order): bool
    {
        return $user->isManager();
    }
}

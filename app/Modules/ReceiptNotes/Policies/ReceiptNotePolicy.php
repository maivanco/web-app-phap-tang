<?php

namespace App\Modules\ReceiptNotes\Policies;

use App\Models\User;
use App\Modules\ReceiptNotes\Models\ReceiptNote;
use Illuminate\Auth\Access\HandlesAuthorization;

class ReceiptNotePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ReceiptNote $receiptNote): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, ReceiptNote $receiptNote): bool
    {
        return true;
    }

    public function delete(User $user, ReceiptNote $receiptNote): bool
    {
        return $user->isManager();
    }
}

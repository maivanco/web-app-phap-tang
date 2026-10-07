<?php

namespace App\Modules\GeneralSettings\Policies;

use App\Models\User;
use App\Modules\GeneralSettings\Models\Setting;
use Illuminate\Auth\Access\HandlesAuthorization;

class SettingPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view settings.
     */
    public function viewAny(User $user): bool
    {
        return $user->isManager();
    }

    /**
     * Determine whether the user can view the setting.
     */
    public function view(User $user, Setting $setting): bool
    {
        return $user->isManager();
    }

    /**
     * Determine whether the user can update settings.
     */
    public function update(User $user, ?Setting $setting = null): bool
    {
        return $user->isManager();
    }
}

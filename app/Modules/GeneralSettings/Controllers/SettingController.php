<?php

namespace App\Modules\GeneralSettings\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\GeneralSettings\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Display settings overview or redirect to primary settings section.
     */
    public function index(Request $request): RedirectResponse
    {
        $this->authorize('viewAny', Setting::class);

        return redirect()->route('admin.general_settings.email');
    }
}

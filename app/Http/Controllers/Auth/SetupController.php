<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class SetupController extends Controller
{
    /**
     * Display the initial setup view.
     */
    public function create(): Response|RedirectResponse
    {
        if (User::count() > 0) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/Setup');
    }

    /**
     * Handle creation of the first administrator account.
     */
    public function store(Request $request): RedirectResponse
    {
        if (User::count() > 0) {
            return redirect()->route('login')->with('status', 'Setup has already been completed.');
        }

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = DB::transaction(function () use ($request) {
            if (User::lockForUpdate()->count() > 0) {
                return null;
            }

            return User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => 'admin',
            ]);
        });

        if (!$user) {
            return redirect()->route('login')->with('status', 'Setup has already been completed.');
        }

        event(new Registered($user));

        Auth::login($user);

        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }
}

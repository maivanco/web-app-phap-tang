<?php

namespace App\Modules\CashFlow\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\CashFlow\Models\TelegramAuthorizedUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of the users.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $query = User::query()->orderByDesc('id');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('telegram_user_id', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        $users = $query->paginate(15)->withQueryString();

        $stats = [
            'total' => User::count(),
            'admins' => User::where('role', 'admin')->count(),
            'managers' => User::where('role', 'manager')->count(),
            'sellers' => User::where('role', 'seller')->count(),
            'telegram_linked' => User::whereNotNull('telegram_user_id')->count(),
        ];

        return Inertia::render('Admin/Modules/CashFlow/Users/Index', [
            'users' => $users,
            'stats' => $stats,
            'filters' => [
                'search' => $request->input('search', ''),
                'role' => $request->input('role', ''),
            ],
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', 'string', 'in:admin,manager,seller'],
            'telegram_user_id' => ['nullable', 'numeric', 'unique:users,telegram_user_id'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'telegram_user_id' => $validated['telegram_user_id'] ?? null,
            'password' => Hash::make($validated['password']),
        ]);

        // Sync with Telegram Authorized Users table
        if (!empty($validated['telegram_user_id'])) {
            TelegramAuthorizedUser::updateOrCreate(
                ['telegram_user_id' => $validated['telegram_user_id']],
                [
                    'full_name' => $user->name,
                    'role' => $user->role,
                    'is_active' => true,
                ]
            );
        }

        return redirect()->route('admin.cashflow.users.index')
            ->with('success', 'Thêm người dùng mới thành công.');
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $this->authorize('update', $user);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', 'string', 'in:admin,manager,seller'],
            'telegram_user_id' => ['nullable', 'numeric', Rule::unique('users', 'telegram_user_id')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        $oldTelegramId = $user->telegram_user_id;

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->role = $validated['role'];
        $user->telegram_user_id = $validated['telegram_user_id'] ?? null;

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        // Sync Telegram authorized users
        $newTelegramId = $validated['telegram_user_id'] ?? null;
        if ($oldTelegramId && $oldTelegramId != $newTelegramId) {
            TelegramAuthorizedUser::where('telegram_user_id', $oldTelegramId)->delete();
        }

        if ($newTelegramId) {
            TelegramAuthorizedUser::updateOrCreate(
                ['telegram_user_id' => $newTelegramId],
                [
                    'full_name' => $user->name,
                    'role' => $user->role,
                    'is_active' => true,
                ]
            );
        }

        return redirect()->route('admin.cashflow.users.index')
            ->with('success', 'Cập nhật thông tin người dùng thành công.');
    }

    /**
     * Remove the specified user.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->authorize('delete', $user);

        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Bạn không thể tự xóa tài khoản đang đăng nhập.');
        }

        if ($user->telegram_user_id) {
            TelegramAuthorizedUser::where('telegram_user_id', $user->telegram_user_id)->delete();
        }

        $user->delete();

        return redirect()->route('admin.cashflow.users.index')
            ->with('success', 'Đã xóa người dùng thành công.');
    }
}

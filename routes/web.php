<?php

use App\Http\Controllers\ProfileController;
use App\Models\User;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    $needsSetup = false;
    try {
        $needsSetup = Schema::hasTable('users') && User::count() === 0;
    } catch (Throwable) {
        $needsSetup = false;
    }

    return Inertia::render('Home/Index', [
        'canLogin' => Route::has('login'),
        'needsSetup' => $needsSetup,
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::redirect('/admin', '/admin/dashboard');

Route::middleware(['auth', 'verified'])->get('/admin/dashboard', function () {
    return redirect()->route('admin.cashflow.dashboard');
})->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/admin/profile/edit', [ProfileController::class, 'edit'])->name('admin/profile.edit');
    Route::patch('/admin/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/admin/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

// Load CashFlow Module routes
if (file_exists(app_path('Modules/CashFlow/routes.php'))) {
    require app_path('Modules/CashFlow/routes.php');
}

// Load QrEventGenerator Module routes
if (file_exists(app_path('Modules/QrEventGenerator/routes.php'))) {
    require app_path('Modules/QrEventGenerator/routes.php');
}

// Load GeneralSettings Module routes
if (file_exists(app_path('Modules/GeneralSettings/routes.php'))) {
    require app_path('Modules/GeneralSettings/routes.php');
}

// Load PayablesReceivables Module routes
if (file_exists(app_path('Modules/PayablesReceivables/routes.php'))) {
    require app_path('Modules/PayablesReceivables/routes.php');
}

// Load ReceiptNotes Module routes
if (file_exists(app_path('Modules/ReceiptNotes/routes.php'))) {
    require app_path('Modules/ReceiptNotes/routes.php');
}

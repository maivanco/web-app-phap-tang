<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
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
    return Inertia::render('Home/Index', [
        'canLogin' => Route::has('login'),
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

require __DIR__ . '/auth.php';

// Load CashFlow Module routes
if (file_exists(app_path('Modules/CashFlow/routes.php'))) {
    require app_path('Modules/CashFlow/routes.php');
}


<?php

use App\Modules\CashFlow\Controllers\CardSettlementController;
use App\Modules\CashFlow\Controllers\DashboardController;
use App\Modules\CashFlow\Controllers\ExpenseController;
use App\Modules\CashFlow\Controllers\InternalTransferController;
use App\Modules\CashFlow\Controllers\OrderController;
use App\Modules\CashFlow\Controllers\TelegramWebhookController;
use App\Modules\CashFlow\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public Telegram Webhook Endpoint
Route::post('/api/telegram/webhook', [TelegramWebhookController::class, 'handle'])
    ->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class]);

// Authenticated CashFlow routes
Route::middleware(['auth'])->prefix('admin/cashflow')->name('admin.cashflow.')->group(function () {
    // Dashboard & Reports
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // User Management
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    // Sales Orders
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/create', [OrderController::class, 'create'])->name('orders.create');
    Route::post('/orders', [OrderController::class, 'store'])->name('orders.store');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::get('/orders/{order}/edit', [OrderController::class, 'edit'])->name('orders.edit');
    Route::put('/orders/{order}', [OrderController::class, 'update'])->name('orders.update');
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
    Route::post('/orders/{order}/sync-sheets', [OrderController::class, 'syncSheets'])->name('orders.sync-sheets');

    // Expenses
    Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::get('/expenses/create', [ExpenseController::class, 'create'])->name('expenses.create');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
    Route::put('/expenses/{expense}', [ExpenseController::class, 'update'])->name('expenses.update');
    Route::post('/expenses/{expense}/cancel', [ExpenseController::class, 'cancel'])->name('expenses.cancel');
    Route::post('/expenses/{expense}/sync-sheets', [ExpenseController::class, 'syncSheets'])->name('expenses.sync-sheets');

    // Card Reconciliation / Settlements
    Route::get('/card-settlements', [CardSettlementController::class, 'index'])->name('card-settlements.index');
    Route::post('/card-settlements/{payment}/settle', [CardSettlementController::class, 'settle'])->name('card-settlements.settle');

    // Internal Transfers & Adjustments
    Route::get('/transfers', [InternalTransferController::class, 'index'])->name('transfers.index');
    Route::post('/transfers', [InternalTransferController::class, 'store'])->name('transfers.store');
});

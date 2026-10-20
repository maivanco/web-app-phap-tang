<?php

use App\Modules\PayablesReceivables\Controllers\PayableController;
use App\Modules\PayablesReceivables\Controllers\ReceivableController;
use Illuminate\Support\Facades\Route;

// Authenticated Payables & Receivables routes
Route::middleware(['auth'])->prefix('admin/payables-receivables')->name('admin.payables-receivables.')->group(function () {
    // Accounts Receivable (Công nợ phải thu)
    Route::get('/receivables', [ReceivableController::class, 'index'])->name('receivables.index');
    Route::post('/receivables/{order}/settle', [ReceivableController::class, 'settle'])->name('receivables.settle');

    // Accounts Payable (Công nợ phải trả)
    Route::get('/payables', [PayableController::class, 'index'])->name('payables.index');
    Route::post('/payables', [PayableController::class, 'store'])->name('payables.store');
    Route::put('/payables/{payable}', [PayableController::class, 'update'])->name('payables.update');
    Route::post('/payables/{payable}/mark-paid', [PayableController::class, 'markPaid'])->name('payables.mark-paid');
    Route::delete('/payables/{payable}', [PayableController::class, 'destroy'])->name('payables.destroy');
});

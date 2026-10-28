<?php

use App\Modules\ReceiptNotes\Controllers\ReceiptNoteController;
use Illuminate\Support\Facades\Route;

// Authenticated Receipt Notes routes
Route::middleware(['auth'])->prefix('admin/receipt-notes')->name('admin.receipt-notes.')->group(function () {
    Route::get('/', [ReceiptNoteController::class, 'index'])->name('index');
    Route::get('/create', [ReceiptNoteController::class, 'create'])->name('create');
    Route::post('/', [ReceiptNoteController::class, 'store'])->name('store');
    Route::get('/export', [ReceiptNoteController::class, 'export'])->name('export');
    Route::get('/{receiptNote}', [ReceiptNoteController::class, 'show'])->name('show');
    Route::get('/{receiptNote}/edit', [ReceiptNoteController::class, 'edit'])->name('edit');
    Route::put('/{receiptNote}', [ReceiptNoteController::class, 'update'])->name('update');
    Route::post('/{receiptNote}/deliver', [ReceiptNoteController::class, 'markDelivered'])->name('deliver');
    Route::delete('/{receiptNote}', [ReceiptNoteController::class, 'destroy'])->name('destroy');
});

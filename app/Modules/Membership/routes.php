<?php

use App\Modules\Membership\Controllers\MembershipCardController;
use App\Modules\Membership\Controllers\MembershipScannerController;
use App\Modules\Membership\Controllers\MembershipTypeController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->prefix('admin/membership')->name('admin.membership.')->group(function () {
    // Membership Types
    Route::resource('types', MembershipTypeController::class)->except(['show']);

    // Membership Cards
    Route::get('/cards', [MembershipCardController::class, 'index'])->name('cards.index');
    Route::get('/cards/create', [MembershipCardController::class, 'create'])->name('cards.create');
    Route::post('/cards', [MembershipCardController::class, 'store'])->name('cards.store');
    Route::get('/cards/{card}', [MembershipCardController::class, 'show'])->name('cards.show');
    Route::delete('/cards/{card}', [MembershipCardController::class, 'destroy'])->name('cards.destroy');
    Route::post('/cards/{card}/resend-email', [MembershipCardController::class, 'resendEmail'])->name('cards.resend_email');
    Route::get('/cards/{card}/download-qr', [MembershipCardController::class, 'downloadQr'])->name('cards.download_qr');

    // Scanner & Benefit Check-in
    Route::get('/scanner', [MembershipScannerController::class, 'index'])->name('scanner.index');
    Route::post('/scanner/lookup', [MembershipScannerController::class, 'lookup'])->name('scanner.lookup');
    Route::post('/scanner/check-in', [MembershipScannerController::class, 'checkIn'])->name('scanner.check_in');
    Route::get('/check-in/{card_code}', [MembershipScannerController::class, 'directCheckInPage'])->name('scanner.direct_check_in');
});

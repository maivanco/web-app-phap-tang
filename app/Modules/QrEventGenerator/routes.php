<?php

use App\Modules\QrEventGenerator\Controllers\EventAttendeeController;
use App\Modules\QrEventGenerator\Controllers\EventController;
use App\Modules\QrEventGenerator\Controllers\QrScannerController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->prefix('admin/qr-events')->name('admin.qr_events.')->group(function () {
    // Events
    Route::get('/', [EventController::class, 'index'])->name('index');
    Route::get('/create', [EventController::class, 'create'])->name('create');
    Route::post('/', [EventController::class, 'store'])->name('store');
    Route::get('/{event}/edit', [EventController::class, 'edit'])->name('edit');
    Route::put('/{event}', [EventController::class, 'update'])->name('update');
    Route::delete('/{event}', [EventController::class, 'destroy'])->name('destroy');
    Route::get('/{event}', [EventController::class, 'show'])->name('show');

    // Attendees under Event
    Route::post('/{event}/attendees', [EventAttendeeController::class, 'store'])->name('attendees.store');
    Route::put('/attendees/{attendee}', [EventAttendeeController::class, 'update'])->name('attendees.update');
    Route::delete('/attendees/{attendee}', [EventAttendeeController::class, 'destroy'])->name('attendees.destroy');
    Route::get('/attendees/{attendee}/download-ticket', [EventAttendeeController::class, 'downloadTicket'])->name('attendees.download_ticket');
    Route::get('/attendees/{attendee}/qr-image', [EventAttendeeController::class, 'qrImage'])->name('attendees.qr_image');

    // Scanner & Check-in
    Route::get('/scanner/view', [QrScannerController::class, 'index'])->name('scanner.index');
    Route::post('/scanner/lookup', [QrScannerController::class, 'lookup'])->name('scanner.lookup');
    Route::post('/scanner/check-in', [QrScannerController::class, 'checkIn'])->name('scanner.check_in');
    Route::get('/check-in/{ticket_code}', [QrScannerController::class, 'directCheckInPage'])->name('scanner.direct_check_in');
});

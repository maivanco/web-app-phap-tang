<?php

use App\Modules\GeneralSettings\Controllers\EmailSettingController;
use App\Modules\GeneralSettings\Controllers\SettingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->prefix('admin/settings')->name('admin.general_settings.')->group(function () {
    Route::get('/', [SettingController::class, 'index'])->name('index');

    // Email Settings
    Route::get('/email', [EmailSettingController::class, 'index'])->name('email');
    Route::post('/email', [EmailSettingController::class, 'update'])->name('email.update');
    Route::post('/email/test-connection', [EmailSettingController::class, 'testConnection'])->name('email.test_connection');
    Route::post('/email/send-test', [EmailSettingController::class, 'sendTestEmail'])->name('email.send_test');
});

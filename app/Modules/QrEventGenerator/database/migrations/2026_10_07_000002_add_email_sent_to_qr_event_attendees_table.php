<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('qr_event_attendees', function (Blueprint $table) {
            $table->boolean('is_email_sent')->default(false)->after('email');
            $table->dateTime('email_sent_at')->nullable()->after('is_email_sent');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('qr_event_attendees', function (Blueprint $table) {
            $table->dropColumn(['is_email_sent', 'email_sent_at']);
        });
    }
};

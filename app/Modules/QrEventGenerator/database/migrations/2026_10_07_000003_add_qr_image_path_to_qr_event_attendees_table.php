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
            $table->string('qr_image_path')->nullable()->after('ticket_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('qr_event_attendees', function (Blueprint $table) {
            $table->dropColumn('qr_image_path');
        });
    }
};

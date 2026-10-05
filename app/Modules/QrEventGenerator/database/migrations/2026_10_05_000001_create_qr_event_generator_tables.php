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
        Schema::create('qr_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->dateTime('event_date')->nullable();
            $table->string('status', 32)->default('active'); // active, draft, completed, cancelled
            $table->timestamps();
        });

        Schema::create('qr_event_attendees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('qr_events')->cascadeOnDelete();
            $table->string('ticket_code', 64)->unique();
            $table->string('full_name');
            $table->string('phone', 32);
            $table->string('email')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 32)->default('pending'); // pending, checked_in, cancelled
            $table->dateTime('checked_in_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['event_id', 'status']);
            $table->index('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('qr_event_attendees');
        Schema::dropIfExists('qr_events');
    }
};

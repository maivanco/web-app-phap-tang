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
        Schema::create('membership_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('code', 64)->nullable()->unique();
            $table->text('description')->nullable();
            $table->decimal('price', 15, 2)->default(0);
            $table->unsignedInteger('validity_duration')->default(1);
            $table->string('validity_unit', 16)->default('month'); // day, month, year
            $table->json('promotion_programs')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('membership_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('membership_type_id')->constrained('membership_types')->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('card_code', 64)->unique();
            $table->string('customer_name');
            $table->date('customer_dob')->nullable();
            $table->string('customer_email');
            $table->string('customer_phone', 32);
            $table->dateTime('issued_at');
            $table->dateTime('expires_at');
            $table->string('status', 32)->default('active'); // active, expired, suspended, cancelled
            $table->json('card_benefits')->nullable();
            $table->string('qr_image_path')->nullable();
            $table->boolean('is_email_sent')->default(false);
            $table->dateTime('email_sent_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('card_code');
            $table->index('customer_phone');
            $table->index('customer_email');
            $table->index(['membership_type_id', 'status']);
        });

        Schema::create('membership_card_checkins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('membership_card_id')->constrained('membership_cards')->cascadeOnDelete();
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('benefit_id', 64)->nullable();
            $table->string('benefit_name');
            $table->text('notes')->nullable();
            $table->dateTime('checked_in_at');
            $table->timestamps();

            $table->index(['membership_card_id', 'checked_in_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('membership_card_checkins');
        Schema::dropIfExists('membership_cards');
        Schema::dropIfExists('membership_types');
    }
};

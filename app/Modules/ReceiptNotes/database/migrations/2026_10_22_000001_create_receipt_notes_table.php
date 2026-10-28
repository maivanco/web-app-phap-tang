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
        Schema::create('receipt_notes', function (Blueprint $table) {
            $table->id();
            $table->string('note_code', 50)->unique();
            $table->date('received_date');
            $table->date('appointment_date')->nullable();
            $table->string('customer_name');
            $table->string('customer_phone', 50)->nullable();

            // Service request fields
            $table->json('service_types')->nullable(); // e.g. ["thay_day", "that_lai", "chinh_size", "khac"]
            $table->text('other_service_description')->nullable();
            $table->decimal('estimated_price', 15, 2)->default(0);
            $table->string('estimated_pickup_time', 100)->nullable();
            $table->boolean('has_photos_saved')->default(false); // Ảnh tình trạng vòng đã lưu trên chatbot

            // Delivery / Return fields
            $table->boolean('inspected_at_counter')->default(false); // Khách đã kiểm tra vòng tại quầy
            $table->decimal('final_amount', 15, 2)->default(0); // Số tiền cần thanh toán
            $table->string('status', 20)->default('chua_giao'); // chua_giao, da_giao, da_huy
            $table->dateTime('delivered_at')->nullable(); // Ngày / giờ giao
            $table->text('proxy_receiver_info')->nullable(); // Thông tin / cách xác minh người nhận thay
            $table->string('receiver_signature')->nullable(); // Khách / người nhận ký
            $table->string('delivery_staff_name')->nullable(); // Nhân viên giao

            // Relations & Tracking
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('telegram_user_id')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('status');
            $table->index('received_date');
            $table->index('appointment_date');
            $table->index('customer_phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('receipt_notes');
    }
};

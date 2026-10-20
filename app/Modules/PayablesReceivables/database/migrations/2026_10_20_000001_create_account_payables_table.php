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
        Schema::create('account_payables', function (Blueprint $table) {
            $table->id();
            $table->string('supplier_name', 255);
            $table->text('description');
            $table->decimal('amount', 15, 2);
            $table->date('due_date')->nullable();
            $table->string('status', 20)->default('unpaid'); // unpaid, paid
            $table->date('paid_at')->nullable();
            $table->text('paid_notes')->nullable();
            $table->foreignId('paid_account_id')->nullable()->constrained('financial_accounts')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('due_date');
            $table->index('supplier_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_payables');
    }
};

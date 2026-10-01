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
        // 1. Branches
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique();
            $table->string('name');
            $table->string('address');
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });

        // 2. Customer Sources
        Schema::create('customer_sources', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique();
            $table->string('name');
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });

        // 3. Brands
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique();
            $table->string('name');
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });

        // 4. Financial Accounts (Cash funds per branch + Bank accounts + Card Gateway)
        Schema::create('financial_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('letter_code', 10)->nullable();
            $table->string('name');
            $table->string('type', 20); // cash, bank, card_gateway
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });

        // 5. Initial Balances
        Schema::create('initial_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('financial_accounts')->cascadeOnDelete();
            $table->date('effective_date');
            $table->decimal('initial_amount', 15, 2)->default(0);
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 6. Orders
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 50)->unique();
            $table->date('sale_date');
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('consultant_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('consultant_name', 150)->nullable();
            $table->string('customer_name', 150);
            $table->string('customer_phone', 30);
            $table->string('customer_gender', 10);
            $table->foreignId('customer_source_id')->constrained('customer_sources');
            $table->string('discount_code', 10)->default('E');
            $table->decimal('discount_rate', 5, 4)->default(0);
            $table->decimal('gross_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('net_revenue', 15, 2)->default(0);
            $table->text('note')->nullable();
            $table->string('status', 30)->default('completed'); // completed, cancelled
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('telegram_user_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['sale_date', 'branch_id']);
        });

        // 7. Order Items
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->unsignedInteger('line_number')->default(1);
            $table->string('product_name');
            $table->foreignId('brand_id')->constrained('brands');
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('gross_amount', 15, 2)->default(0);
            $table->decimal('allocated_discount', 15, 2)->default(0);
            $table->decimal('net_amount', 15, 2)->default(0);
            $table->timestamps();
        });

        // 8. Order Payments
        Schema::create('order_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('method', 20); // cash, bank_transfer, card_swipe, unpaid
            $table->foreignId('account_id')->nullable()->constrained('financial_accounts');
            $table->decimal('amount', 15, 2)->default(0);
            $table->date('payment_date');
            $table->date('card_swipe_date')->nullable();
            $table->date('card_settlement_date')->nullable();
            $table->foreignId('card_settlement_account_id')->nullable()->constrained('financial_accounts')->nullOnDelete();
            $table->decimal('actual_received_amount', 15, 2)->nullable();
            $table->decimal('fee_amount', 15, 2)->nullable();
            $table->string('status', 30)->default('completed'); // completed, pending_settlement, reconciled
            $table->foreignId('settled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 9. Expenses
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('expense_code', 50)->unique();
            $table->date('expense_date');
            $table->foreignId('branch_id')->constrained('branches');
            $table->string('spender_name', 150);
            $table->string('content', 255);
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->string('method', 20); // cash, bank_transfer
            $table->foreignId('account_id')->constrained('financial_accounts');
            $table->text('note')->nullable();
            $table->string('status', 30)->default('completed'); // completed, cancelled
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('telegram_user_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['expense_date', 'branch_id']);
        });

        // 10. Internal Transfers & Adjustments
        Schema::create('internal_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_code', 50)->unique();
            $table->date('transfer_date');
            $table->foreignId('from_account_id')->constrained('financial_accounts');
            $table->foreignId('to_account_id')->constrained('financial_accounts');
            $table->decimal('amount', 15, 2);
            $table->string('transfer_type', 30)->default('internal_transfer'); // internal_transfer, refund, adjustment
            $table->foreignId('related_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 11. Transaction Audits (Versioned before/after audit log)
        Schema::create('transaction_audits', function (Blueprint $table) {
            $table->id();
            $table->string('auditable_type', 100);
            $table->unsignedBigInteger('auditable_id');
            $table->string('action', 30); // update, cancel
            $table->unsignedInteger('version')->default(1);
            $table->text('reason');
            $table->json('before_payload');
            $table->json('after_payload')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('telegram_user_id')->nullable();
            $table->timestamps();

            $table->index(['auditable_type', 'auditable_id']);
        });

        // 12. Telegram Sessions (State machine for bot conversations)
        Schema::create('telegram_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('telegram_chat_id')->unique();
            $table->unsignedBigInteger('telegram_user_id');
            $table->string('username')->nullable();
            $table->string('current_mode', 30)->nullable(); // order, expense
            $table->unsignedInteger('current_step')->default(0);
            $table->foreignId('selected_branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->json('draft_data')->nullable();
            $table->unsignedBigInteger('last_message_id')->nullable();
            $table->timestamps();
        });

        // 13. Telegram Authorized Users
        Schema::create('telegram_authorized_users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('telegram_user_id')->unique();
            $table->string('full_name');
            $table->string('role', 20)->default('seller'); // seller, manager, admin
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('telegram_authorized_users');
        Schema::dropIfExists('telegram_sessions');
        Schema::dropIfExists('transaction_audits');
        Schema::dropIfExists('internal_transfers');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('order_payments');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('initial_balances');
        Schema::dropIfExists('financial_accounts');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('customer_sources');
        Schema::dropIfExists('branches');
    }
};

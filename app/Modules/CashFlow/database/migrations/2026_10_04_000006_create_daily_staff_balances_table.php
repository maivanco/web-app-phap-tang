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
        Schema::create('daily_staff_balances', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('financial_accounts')->cascadeOnDelete();
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->timestamp('opened_at')->nullable();
            $table->decimal('closing_balance', 15, 2)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->string('status', 20)->default('open'); // open, closed
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['date', 'user_id']);
            $table->index(['date', 'account_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_staff_balances');
    }
};

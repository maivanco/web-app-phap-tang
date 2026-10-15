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
        Schema::table('daily_staff_balances', function (Blueprint $table) {
            $table->dropUnique('daily_staff_balances_date_user_id_unique');
            $table->dropIndex('daily_staff_balances_date_account_id_index');
            $table->unique(['date', 'account_id']);
            $table->index(['date', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('daily_staff_balances', function (Blueprint $table) {
            $table->dropUnique(['date', 'account_id']);
            $table->dropIndex(['date', 'user_id']);
            $table->unique(['date', 'user_id']);
            $table->index(['date', 'account_id']);
        });
    }
};

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
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'consultant_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->foreignId('consultant_id')->nullable()->after('branch_id')->constrained('users')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'consultant_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign(['consultant_id']);
                $table->dropColumn('consultant_id');
            });
        }
    }
};

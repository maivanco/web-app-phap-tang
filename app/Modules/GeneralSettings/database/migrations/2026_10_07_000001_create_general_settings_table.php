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
        Schema::create('general_settings', function (Blueprint $table) {
            $table->id('setting_id');
            $table->string('setting_name', 191)->unique();
            $table->longText('setting_value')->nullable();
            $table->string('group', 64)->default('general')->index();
            $table->boolean('autoload')->default(false)->index();
            $table->text('description')->nullable();
            $table->boolean('is_secret')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('general_settings');
    }
};

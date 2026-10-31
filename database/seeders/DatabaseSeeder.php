<?php

namespace Database\Seeders;

use App\Modules\CashFlow\database\seeders\CashFlowSeeder;
use App\Modules\Membership\database\seeders\MembershipTypeSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(UserSeeder::class);
        $this->call(CashFlowSeeder::class);
        $this->call(MembershipTypeSeeder::class);
        $this->call(MembershipTypeSeeder::class);
    }
}

<?php

namespace App\Providers;

// use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        \App\Modules\CashFlow\Models\Order::class => \App\Modules\CashFlow\Policies\OrderPolicy::class,
        \App\Modules\CashFlow\Models\Expense::class => \App\Modules\CashFlow\Policies\ExpensePolicy::class,
        \App\Modules\CashFlow\Models\InternalTransfer::class => \App\Modules\CashFlow\Policies\InternalTransferPolicy::class,
        \App\Modules\CashFlow\Models\DailyStaffBalance::class => \App\Modules\CashFlow\Policies\DailyStaffBalancePolicy::class,
        \App\Models\User::class => \App\Modules\CashFlow\Policies\UserPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        //
    }
}

<?php

namespace App\Providers;

// use Illuminate\Support\Facades\Gate;
use App\Models\User;
use App\Modules\CashFlow\Models\DailyStaffBalance;
use App\Modules\CashFlow\Models\Expense;
use App\Modules\CashFlow\Models\FinancialAccount;
use App\Modules\CashFlow\Models\InternalTransfer;
use App\Modules\CashFlow\Models\Order;
use App\Modules\CashFlow\Policies\DailyStaffBalancePolicy;
use App\Modules\CashFlow\Policies\ExpensePolicy;
use App\Modules\CashFlow\Policies\FinancialAccountPolicy;
use App\Modules\CashFlow\Policies\InternalTransferPolicy;
use App\Modules\CashFlow\Policies\OrderPolicy;
use App\Modules\CashFlow\Policies\UserPolicy;
use App\Modules\GeneralSettings\Models\Setting;
use App\Modules\GeneralSettings\Policies\SettingPolicy;
use App\Modules\Membership\Models\MembershipCard;
use App\Modules\Membership\Models\MembershipType;
use App\Modules\Membership\Policies\MembershipCardPolicy;
use App\Modules\Membership\Policies\MembershipTypePolicy;
use App\Modules\PayablesReceivables\Models\AccountPayable;
use App\Modules\PayablesReceivables\Policies\AccountPayablePolicy;
use App\Modules\QrEventGenerator\Models\Event;
use App\Modules\QrEventGenerator\Models\EventAttendee;
use App\Modules\QrEventGenerator\Policies\EventAttendeePolicy;
use App\Modules\QrEventGenerator\Policies\EventPolicy;
use App\Modules\ReceiptNotes\Models\ReceiptNote;
use App\Modules\ReceiptNotes\Policies\ReceiptNotePolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Order::class => OrderPolicy::class,
        Expense::class => ExpensePolicy::class,
        InternalTransfer::class => InternalTransferPolicy::class,
        DailyStaffBalance::class => DailyStaffBalancePolicy::class,
        FinancialAccount::class => FinancialAccountPolicy::class,
        User::class => UserPolicy::class,
        Event::class => EventPolicy::class,
        EventAttendee::class => EventAttendeePolicy::class,
        Setting::class => SettingPolicy::class,
        AccountPayable::class => AccountPayablePolicy::class,
        ReceiptNote::class => ReceiptNotePolicy::class,
        MembershipType::class => MembershipTypePolicy::class,
        MembershipCard::class => MembershipCardPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        //
    }
}

<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Load migrations from module directories
        foreach (glob(app_path('Modules/*/database/migrations'), GLOB_ONLYDIR) as $path) {
            $this->loadMigrationsFrom($path);
        }
    }
}

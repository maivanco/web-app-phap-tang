<?php

namespace App\Modules\GeneralSettings\Services;

use App\Modules\GeneralSettings\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingService
{
    protected const CACHE_PREFIX = 'app_setting_';
    protected const CACHE_AUTOLOAD_KEY = 'app_settings_autoload';

    /**
     * Get a setting value by name.
     */
    public function get(string $name, mixed $default = null): mixed
    {
        return Cache::remember(self::CACHE_PREFIX . $name, 3600, function () use ($name, $default) {
            $setting = Setting::where('setting_name', $name)->first();

            return $setting !== null ? $setting->setting_value : $default;
        });
    }

    /**
     * Set or update a setting value.
     */
    public function set(
        string $name,
        mixed $value,
        string $group = 'general',
        bool $autoload = false,
        ?string $description = null,
        bool $isSecret = false
    ): Setting {
        $setting = Setting::updateOrCreate(
            ['setting_name' => $name],
            [
                'setting_value' => $value,
                'group' => $group,
                'autoload' => $autoload,
                'description' => $description,
                'is_secret' => $isSecret,
            ]
        );

        Cache::forget(self::CACHE_PREFIX . $name);
        Cache::forget(self::CACHE_AUTOLOAD_KEY);

        return $setting;
    }

    /**
     * Bulk save settings in a group.
     *
     * @param array<string, mixed> $values [setting_name => setting_value]
     * @param array<string, array> $meta [setting_name => ['description' => ..., 'is_secret' => ..., 'autoload' => ...]]
     */
    public function setMany(array $values, string $group = 'general', array $meta = []): void
    {
        foreach ($values as $name => $value) {
            $metadata = $meta[$name] ?? [];
            $this->set(
                name: $name,
                value: $value,
                group: $group,
                autoload: $metadata['autoload'] ?? false,
                description: $metadata['description'] ?? null,
                isSecret: $metadata['is_secret'] ?? false
            );
        }
    }

    /**
     * Get all settings in a specific group as key-value pairs.
     *
     * @return array<string, mixed>
     */
    public function getGroupValues(string $group): array
    {
        return Setting::where('group', $group)
            ->pluck('setting_value', 'setting_name')
            ->toArray();
    }

    /**
     * Get all setting models in a specific group.
     */
    public function getGroupSettings(string $group)
    {
        return Setting::where('group', $group)->get();
    }

    /**
     * Delete a setting by name.
     */
    public function delete(string $name): bool
    {
        $deleted = Setting::where('setting_name', $name)->delete();
        Cache::forget(self::CACHE_PREFIX . $name);
        Cache::forget(self::CACHE_AUTOLOAD_KEY);

        return $deleted > 0;
    }

    /**
     * Load all autoloaded settings into an array.
     */
    public function getAutoloaded(): array
    {
        return Cache::rememberForever(self::CACHE_AUTOLOAD_KEY, function () {
            return Setting::where('autoload', true)
                ->pluck('setting_value', 'setting_name')
                ->toArray();
        });
    }
}

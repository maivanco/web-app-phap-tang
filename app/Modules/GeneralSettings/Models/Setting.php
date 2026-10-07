<?php

namespace App\Modules\GeneralSettings\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $table = 'general_settings';

    protected $primaryKey = 'setting_id';

    protected $fillable = [
        'setting_name',
        'setting_value',
        'group',
        'autoload',
        'description',
        'is_secret',
    ];

    protected $casts = [
        'autoload' => 'boolean',
        'is_secret' => 'boolean',
    ];

    /**
     * Scope query to a specific group.
     */
    public function scopeGroup($query, string $group)
    {
        return $query->where('group', $group);
    }

    /**
     * Scope query to autoloaded settings.
     */
    public function scopeAutoload($query)
    {
        return $query->where('autoload', true);
    }
}

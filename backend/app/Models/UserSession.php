<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSession extends Model
{
    protected $fillable = [
        'user_id',
        'token_id',
        'device_type',
        'device_name',
        'browser',
        'os',
        'ip_address',
        'location',
        'is_current',
        'last_active_at',
        'expires_at',
    ];

    protected $casts = [
        'is_current'     => 'boolean',
        'last_active_at' => 'datetime',
        'expires_at'     => 'datetime',
    ];

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TwoFactorSession extends Model
{
    protected $fillable = [
        'user_id',
        'session_token',
        'ip_address',
        'user_agent',
        'verified_at',
        'expires_at',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'expires_at'  => 'datetime',
    ];

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isValid(): bool
    {
        return !$this->isExpired();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
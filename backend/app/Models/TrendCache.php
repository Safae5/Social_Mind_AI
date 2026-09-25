<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrendCache extends Model
{
    protected $fillable = [
        'user_id', 'subject', 'platform', 'trends_data', 'sources_used', 'expires_at',
    ];

    protected $casts = [
        'trends_data'  => 'array',
        'sources_used' => 'array',
        'expires_at'   => 'datetime',
    ];

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
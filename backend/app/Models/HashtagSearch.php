<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HashtagSearch extends Model
{
    protected $fillable = [
        'user_id', 'subject', 'platform', 'language',
        'result_data', 'keywords_detected', 'total_hashtags', 'expires_at',
    ];

    protected $casts = [
        'result_data'       => 'array',
        'keywords_detected' => 'array',
        'expires_at'        => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
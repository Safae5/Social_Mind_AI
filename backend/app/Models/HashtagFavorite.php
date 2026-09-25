<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HashtagFavorite extends Model
{
    protected $fillable = [
        'user_id', 'name', 'subject', 'platform',
        'hashtags', 'categorized', 'notes', 'times_used',
    ];

    protected $casts = [
        'hashtags'   => 'array',
        'categorized'=> 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function incrementUsage(): void
    {
        $this->increment('times_used');
    }
}
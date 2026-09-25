<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CiCompetitorPost extends Model
{
    protected $table = 'ci_competitor_posts';

    protected $fillable = [
        'user_id', 'ci_competitor_account_id', 'competitor',
        'platform', 'post_id', 'caption', 'content_type',
        'likes', 'comments', 'shares', 'reach', 'hashtags',
        'post_url', 'media_url', 'posted_at', 'source',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function competitorAccount(): BelongsTo
    {
        return $this->belongsTo(CiCompetitorAccount::class, 'ci_competitor_account_id');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeRecentDays($query, int $days = 30)
    {
        return $query->where('posted_at', '>=', now()->subDays($days));
    }
}
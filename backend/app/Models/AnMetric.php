<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnMetric extends Model
{
    protected $table = 'an_metrics';

    protected $fillable = [
        'user_id', 'sm_account_id', 'client_id',
        'platform_post_id', 'platform', 'content_type',
        'likes', 'comments', 'shares', 'reach', 'impressions', 'saves', 'followers',
        'engagement_rate', 'engagement_score',
        'posted_at', 'collected_at', 'source',
    ];

    protected $casts = [
        'posted_at'       => 'datetime',
        'collected_at'    => 'datetime',
        'engagement_rate' => 'float',
        'engagement_score'=> 'float',
    ];

    // ── Relations ─────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function smAccount(): BelongsTo
    {
        return $this->belongsTo(SmAccount::class, 'sm_account_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    // ── Scopes ────────────────────────────────────────────────

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForAccount($query, int $smAccountId)
    {
        return $query->where('sm_account_id', $smAccountId);
    }

    public function scopeForClient($query, int $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('collected_at', '>=', now()->subDays($days));
    }

    public function scopePlatform($query, string $platform)
    {
        return $query->where('platform', $platform);
    }
}
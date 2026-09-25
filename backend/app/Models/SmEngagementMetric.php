<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmEngagementMetric extends Model
{
    protected $table = 'sm_engagement_metrics';

    protected $fillable = [
        'social_account_id',
        'metric_type',
        'value',
        'recorded_at',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
        'value'       => 'integer',
    ];

    // ── Relations ─────────────────────────────────────────────

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SmAccount::class, 'social_account_id');
    }

    // ── Scopes ────────────────────────────────────────────────

    public function scopeForAccount($query, int $accountId)
    {
        return $query->where('social_account_id', $accountId);
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('metric_type', $type);
    }

    public function scopeLastDays($query, int $days = 7)
    {
        return $query->where('recorded_at', '>=', now()->subDays($days));
    }
}
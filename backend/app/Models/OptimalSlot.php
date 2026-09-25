<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OptimalSlot extends Model
{
    protected $fillable = [
        'user_id', 'social_account_id', 'day_of_week', 'day_name',
        'hour', 'time', 'platform',
        'engagement_score', 'reach_score', 'composite_score',
        'rank', 'cluster_id', 'posts_analyzed',
        'heatmap_data', 'prophet_forecast', 'data_source',
        'analyzed_at', 'expires_at',
    ];

    protected $casts = [
        'heatmap_data'     => 'array',
        'prophet_forecast' => 'array',
        'analyzed_at'      => 'datetime',
        'expires_at'       => 'datetime',
        'engagement_score' => 'float',
        'reach_score'      => 'float',
        'composite_score'  => 'float',
    ];

    // ── Relations ─────────────────────────────────────────────
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class);
    }

    public function scheduledPosts(): HasMany
    {
        return $this->hasMany(ScheduledPost::class);
    }

    // ── Scopes ────────────────────────────────────────────────
    public function scopeValid($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    public function scopeTopSlots($query, int $limit = 14)
    {
        return $query->orderBy('composite_score', 'desc')->limit($limit);
    }

    // ── Helpers ────────────────────────────────────────────────
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function getNextOccurrence(): ?\Carbon\Carbon
    {
        $now       = now();
        $targetDay = $this->day_of_week; // 0=Lundi
        $targetHour = $this->hour;

        $candidate = $now->copy()->next($this->getLaravelDayOfWeek())->setTime($targetHour, 0);
        if ($candidate->isPast()) {
            $candidate->addWeek();
        }
        return $candidate;
    }

    private function getLaravelDayOfWeek(): int
    {
        // Prophet: 0=Lundi..6=Dimanche → Carbon: 1=Lundi..6=Samedi, 0=Dimanche.
        // Pas de fallback ?: 7 ici : Carbon::SUNDAY vaut 0, pas 7 (contrairement
        // à ISO-8601) — le fallback provoquait "Undefined array key 7" dans
        // Carbon\Traits\Modifiers::next() pour tout créneau du dimanche.
        return ($this->day_of_week + 1) % 7;
    }
}
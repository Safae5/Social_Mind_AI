<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContentQueue extends Model
{
    use SoftDeletes;

    protected $table = 'content_queue';

    protected $fillable = [
        'user_id', 'social_account_id',
        'caption', 'hashtags', 'media_path', 'media_url', 'media_type',
        'carousel_items', 'source', 'generated_content_id', 'calendar_slot_id',
        'status', 'queue_position', 'failure_reason', 'retry_count',
    ];

    protected $casts = [
        'hashtags'       => 'array',
        'carousel_items' => 'array',
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
    public function scopeQueued($query)
    {
        return $query->where('status', 'queued')->orderBy('queue_position');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    // ── Helpers ────────────────────────────────────────────────
    public function getFullCaptionAttribute(): string
    {
        $hashtags = $this->hashtags ? implode(' ', $this->hashtags) : '';
        return trim($this->caption . ($hashtags ? "\n\n" . $hashtags : ''));
    }
}
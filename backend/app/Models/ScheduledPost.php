<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ScheduledPost extends Model
{
    use SoftDeletes;

    protected $fillable = [
        // ── Colonnes originales ───────────────────────────────
        'user_id',
        'social_media_account_id',
        'client_profile_id',
        'caption',
        'media_urls',
        'hashtags',
        'post_type',
        'scheduled_at',
        'ai_optimized_time',
        'status',
        'platform_post_id',
        'error_message',
        'published_at',
        'created_by_agent',

        // ── Nouvelles colonnes Agent 1 ─────────────────────────
        'content_queue_id',
        'optimal_slot_id',
        'media_path',
        'media_url',
        'media_type',
        'carousel_items',
        'slot_score',
        'platform_post_url',
        'failure_reason',
        'retry_count',
        'next_retry_at',
    ];

    protected $casts = [
        'media_urls'        => 'array',
        'hashtags'          => 'array',
        'carousel_items'    => 'array',
        'scheduled_at'      => 'datetime',
        'published_at'      => 'datetime',
        'next_retry_at'     => 'datetime',
        'ai_optimized_time' => 'boolean',
        'slot_score'        => 'float',
    ];

    // ══════════════════════════════════════════════════════════
    // RELATIONS
    // ══════════════════════════════════════════════════════════

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Compatible avec l'ancien nom de colonne
    public function socialMediaAccount(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class, 'social_media_account_id');
    }

    // Alias pour l'Agent 1
    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class, 'social_media_account_id');
    }

    public function clientProfile(): BelongsTo
    {
        return $this->belongsTo(ClientProfile::class);
    }

    public function contentQueue(): BelongsTo
    {
        return $this->belongsTo(ContentQueue::class);
    }

    public function optimalSlot(): BelongsTo
    {
        return $this->belongsTo(OptimalSlot::class);
    }

    // ══════════════════════════════════════════════════════════
    // SCOPES
    // ══════════════════════════════════════════════════════════

    // Posts prêts à être publiés maintenant
    public function scopePending($query)
    {
        return $query->whereIn('status', ['pending', 'scheduled', 'draft'])
                     ->where('scheduled_at', '<=', now());
    }

    // Posts planifiés dans le futur
    public function scopeUpcoming($query)
    {
        return $query->whereIn('status', ['pending', 'scheduled', 'draft'])
                     ->where('scheduled_at', '>', now())
                     ->orderBy('scheduled_at');
    }

    // Posts échoués éligibles au retry
    public function scopeFailedWithRetries($query)
    {
        return $query->where('status', 'failed')
                     ->where('retry_count', '<', 3)
                     ->where(function ($q) {
                         $q->whereNull('next_retry_at')
                           ->orWhere('next_retry_at', '<=', now());
                     });
    }

    // ══════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════

    // Retourne l'URL du média (nouvelle ou ancienne colonne)
    public function getMediaUrlAttribute($value): ?string
    {
        if ($value) return $value;
        // Fallback sur media_urls (ancien format JSON)
        $urls = $this->media_urls;
        return is_array($urls) && !empty($urls) ? $urls[0] : null;
    }

    // Retourne le type de post unifié
    public function getPostTypeUnified(): string
    {
        return $this->media_type ?? $this->post_type ?? 'image';
    }

    // Retourne le message d'erreur unifié
    public function getErrorMessageUnified(): ?string
    {
        return $this->failure_reason ?? $this->error_message;
    }

    public function shouldRetry(): bool
    {
        return $this->status === 'failed' && $this->retry_count < 3;
    }

    public function scheduleRetry(): void
    {
        $delay = match((int) $this->retry_count) {
            0       => 15,   // 15 minutes
            1       => 60,   // 1 heure
            default => 240,  // 4 heures
        };

        $this->update([
            'status'        => 'pending',
            'next_retry_at' => now()->addMinutes($delay),
            'retry_count'   => $this->retry_count + 1,
        ]);
    }

    public function markPublished(string $postId, ?string $postUrl = null): void
    {
        $this->update([
            'status'            => 'published',
            'published_at'      => now(),
            'platform_post_id'  => $postId,
            'platform_post_url' => $postUrl,
        ]);
    }

    public function markFailed(string $reason): void
    {
        $this->update([
            'status'         => 'failed',
            'failure_reason' => $reason,
            'error_message'  => $reason, // compatibilité ancien code
        ]);
    }
}
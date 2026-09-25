<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InboxMessage extends Model
{
    protected $fillable = [
        'user_id', 'social_account_id',
        'message_type', 'platform_message_id', 'platform',
        'text', 'author_id', 'author_name', 'post_id', 'post_caption',
        'sentiment', 'sentiment_confidence', 'toxicity_score',
        'ai_reply', 'final_reply', 'brand_voice_score',
        'status', 'is_read', 'platform_created_at', 'replied_at',
    ];

    protected $casts = [
        'platform_created_at' => 'datetime',
        'replied_at'          => 'datetime',
        'is_read'             => 'boolean',
        'sentiment_confidence'=> 'float',
        'toxicity_score'      => 'float',
        'brand_voice_score'   => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class);
    }

    public function getSentimentEmoji(): string
    {
        return match($this->sentiment) {
            'positive' => '🟢',
            'question' => '🔵',
            'negative' => '🔴',
            'spam'     => '⚫',
            default    => '⚪',
        };
    }

    public function isPendingApproval(): bool
    {
        return $this->status === 'pending_approval';
    }

    public function isFlagged(): bool
    {
        return $this->status === 'flagged';
    }

    // ── Scopes ────────────────────────────────────────────────
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopePendingApproval($query)
    {
        return $query->where('status', 'pending_approval');
    }

    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }
}
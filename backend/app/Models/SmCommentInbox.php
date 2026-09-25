<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmCommentInbox extends Model
{
    protected $table = 'sm_comment_inbox';

    protected $fillable = [
        'user_id',
        'social_account_id',
        'comment_id',
        'post_id',
        'commenter_name',
        'commenter_id',
        'message',
        'post_content',
        'sentiment_label',
        'sentiment_score',
        'priority',
        'suggested_action',
        'ai_reply_draft',
        'final_reply',
        'reply_status',
        'is_read',
        'meta_created_at',
    ];

    protected $casts = [
        'is_read'         => 'boolean',
        'meta_created_at' => 'datetime',
        'sentiment_score' => 'float',
    ];

    // ── Relations ─────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SmAccount::class, 'social_account_id');
    }

    // ── Helpers ───────────────────────────────────────────────

    public function isNegative(): bool
    {
        return $this->sentiment_label === 'NEGATIVE';
    }

    public function isPositive(): bool
    {
        return $this->sentiment_label === 'POSITIVE';
    }

    public function isUrgent(): bool
    {
        return $this->priority === 'high'
            && $this->reply_status === 'pending';
    }

    public function needsReply(): bool
    {
        return in_array($this->reply_status, ['pending', 'draft']);
    }

    // ── Scopes ────────────────────────────────────────────────

    public function scopePending($query)
    {
        return $query->where('reply_status', 'pending');
    }

    public function scopeNegative($query)
    {
        return $query->where('sentiment_label', 'NEGATIVE');
    }

    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    public function scopeByPriority($query)
    {
        return $query->orderByRaw("FIELD(priority, 'high', 'medium', 'low')");
    }
}
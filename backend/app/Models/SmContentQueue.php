<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmContentQueue extends Model
{
    protected $table = 'sm_content_queue';

    protected $fillable = [
        'user_id',
        'social_account_id',
        'message',
        'image_url',
        'link_url',
        'scheduled_at',
        'prophet_slot_score',
        'status',
        'meta_post_id',
        'error_message',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
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

    /** Vérifie si la publication est prête à être envoyée. */
    public function isReadyToPublish(): bool
    {
        return $this->status === 'scheduled'
            && $this->scheduled_at <= now();
    }

    // ── Scopes ────────────────────────────────────────────────

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    public function scopeDueNow($query)
    {
        return $query->where('status', 'scheduled')
                     ->where('scheduled_at', '<=', now());
    }
}
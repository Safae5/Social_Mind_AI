<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarSlot extends Model
{
    protected $fillable = [
        'content_calendar_id', 'user_id',
        'day_name', 'date', 'day_index', 'is_rest_day',
        'platform', 'post_type', 'subject', 'angle', 'caption_idea',
        'best_time', 'hashtag_themes', 'hashtags', 'why',
        'coherence_score', 'status',
        'user_platform', 'user_post_type', 'user_subject',
        'user_caption', 'user_time', 'content_queue_id',
    ];

    protected $casts = [
        'hashtag_themes' => 'array',
        'hashtags'       => 'array',
        'date'           => 'date',
        'is_rest_day'    => 'boolean',
    ];

    public function calendar(): BelongsTo
    {
        return $this->belongsTo(ContentCalendar::class, 'content_calendar_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Retourne le contenu final (modifié si applicable).
     */
    public function getFinalContent(): array
    {
        return [
            'platform'  => $this->user_platform  ?? $this->platform,
            'post_type' => $this->user_post_type  ?? $this->post_type,
            'subject'   => $this->user_subject    ?? $this->subject,
            'caption'   => $this->user_caption    ?? $this->caption_idea,
            'time'      => $this->user_time       ?? $this->best_time,
            'hashtags'  => $this->hashtags        ?? [],
        ];
    }
}
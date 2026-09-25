<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyReport extends Model
{
    protected $fillable = [
        'user_id', 'social_account_id',
        'week_start', 'week_end', 'week_number', 'year',
        'total_reach', 'total_engagement', 'total_likes',
        'total_comments', 'total_shares', 'total_saves', 'total_posts',
        'followers_gained', 'followers_lost', 'followers_now',
        'best_post_id', 'best_post_caption', 'best_post_reach', 'best_post_likes',
        'ai_bilan', 'ai_top_publication', 'ai_audience',
        'ai_recommandation', 'ai_emoji_semaine', 'ai_titre_semaine',
        'score', 'trend_data',
        'email_sent', 'email_sent_at', 'is_read', 'read_at',
    ];

    protected $casts = [
        'trend_data'    => 'array',
        'week_start'    => 'date',
        'week_end'      => 'date',
        'email_sent'    => 'boolean',
        'is_read'       => 'boolean',
        'email_sent_at' => 'datetime',
        'read_at'       => 'datetime',
    ];

    // ══════════════════════════════════════════════════════════
    // RELATIONS
    // ══════════════════════════════════════════════════════════

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class);
    }

    // ══════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════

    /**
     * Retourne le résumé formaté pour l'email et React.
     */
    public function getSummaryArray(): array
    {
        return [
            'id'              => $this->id,
            'week_start'      => $this->week_start?->format('d/m/Y'),
            'week_end'        => $this->week_end?->format('d/m/Y'),
            'week_number'     => $this->week_number,
            'year'            => $this->year,
            'score'           => $this->score,
            'emoji'           => $this->ai_emoji_semaine,
            'titre'           => $this->ai_titre_semaine,
            'bilan'           => $this->ai_bilan,
            'top_publication' => $this->ai_top_publication,
            'audience'        => $this->ai_audience,
            'recommandation'  => $this->ai_recommandation,
            'metrics'         => [
                'reach'            => $this->total_reach,
                'engagement'       => $this->total_engagement,
                'likes'            => $this->total_likes,
                'comments'         => $this->total_comments,
                'posts'            => $this->total_posts,
                'followers_gained' => $this->followers_gained,
                'followers_lost'   => $this->followers_lost,
                'followers_now'    => $this->followers_now,
            ],
            'best_post' => $this->best_post_id ? [
                'id'      => $this->best_post_id,
                'caption' => $this->best_post_caption,
                'reach'   => $this->best_post_reach,
                'likes'   => $this->best_post_likes,
            ] : null,
            'trend_data' => $this->trend_data,
            'is_read'    => $this->is_read,
            'email_sent' => $this->email_sent,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    public function markAsRead(): void
    {
        if (!$this->is_read) {
            $this->update(['is_read' => true, 'read_at' => now()]);
        }
    }
}
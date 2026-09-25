<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class GeneratedContent extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'subject',
        'platform',
        'tone',
        'language',
        'extra_context',
        'brand_examples',
        'variants',
        'image_path',
        'video_path',
        'image_url',
        'video_url',
        'brand_voice_dominant_tone',
        'brand_voice_n_examples',
        'social_account_id',
        'selected_variant',
        'publish_status',
        'platform_post_id',
        'platform_post_url',
        'published_at',
        'publish_error',
    ];

    protected $casts = [
        'brand_examples' => 'array',
        'variants'       => 'array',
        'published_at'   => 'datetime',
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
     * Retourne la variante sélectionnée par l'utilisateur.
     */
    public function getSelectedVariantData(): ?array
    {
        if (!$this->selected_variant || !$this->variants) {
            return null;
        }
        return collect($this->variants)->firstWhere('id', $this->selected_variant);
    }

    /**
     * URL publique de l'image.
     */
    public function getImagePublicUrl(): ?string
    {
        if ($this->image_url) return $this->image_url;
        if ($this->image_path) return Storage::disk('public')->url($this->image_path);
        return null;
    }

    /**
     * URL publique de la vidéo.
     */
    public function getVideoPublicUrl(): ?string
    {
        if ($this->video_url) return $this->video_url;
        if ($this->video_path) return Storage::disk('public')->url($this->video_path);
        return null;
    }

    /**
     * Légende finale = caption + hashtags de la variante sélectionnée.
     */
    public function getFinalCaption(): string
    {
        $variant  = $this->getSelectedVariantData();
        if (!$variant) return '';
        $caption  = $variant['caption'] ?? '';
        $hashtags = $variant['hashtags'] ?? [];
        return trim($caption . (count($hashtags) ? "\n\n" . implode(' ', $hashtags) : ''));
    }

    // ══════════════════════════════════════════════════════════
    // SCOPES
    // ══════════════════════════════════════════════════════════

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopePublished($query)
    {
        return $query->where('publish_status', 'published');
    }

    public function scopeDraft($query)
    {
        return $query->where('publish_status', 'draft');
    }
}
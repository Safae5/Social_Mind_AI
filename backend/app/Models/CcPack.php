<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class CcPack extends Model
{
    use SoftDeletes;

    protected $table = 'cc_packs';

    protected $fillable = [
        'user_id', 'client_id',
        'client_name', 'client_niche', 'client_audience',
        'platform', 'subject', 'tone', 'language',
        'caption', 'hashtags', 'cta', 'char_count', 'image_concept',
        'image_path', 'image_url', 'script_data', 'pdf_path', 'pdf_url',
        'publish_status', 'sm_account_id',
        'platform_post_id', 'platform_post_url', 'published_at', 'publish_error',
    ];

    protected $casts = [
        'hashtags'     => 'array',
        'script_data'  => 'array',
        'published_at' => 'datetime',
    ];

    // ── Relations ─────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Compte social utilisé pour la publication (sm_accounts = Agent 2).
     */
    public function smAccount(): BelongsTo
    {
        return $this->belongsTo(SmAccount::class, 'sm_account_id');
    }

    // ── Helpers ───────────────────────────────────────────────

    /**
     * URL publique de l'image PNG SDXL-Turbo.
     */
    public function imagePublicUrl(): ?string
    {
        if ($this->image_url)  return $this->image_url;
        if ($this->image_path) return Storage::disk('public')->url($this->image_path);
        return null;
    }

    /**
     * URL publique du PDF ReportLab.
     */
    public function pdfPublicUrl(): ?string
    {
        if ($this->pdf_url)  return $this->pdf_url;
        if ($this->pdf_path) return Storage::disk('public')->url($this->pdf_path);
        return null;
    }

    /**
     * Légende complète = caption + hashtags (pour publication Meta).
     */
    public function fullCaption(): string
    {
        $caption  = $this->caption  ?? '';
        $hashtags = implode(' ', $this->hashtags ?? []);
        return $caption . ($hashtags ? "\n\n" . $hashtags : '');
    }

    public function isPending(): bool
    {
        return $this->publish_status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->publish_status === 'approved';
    }

    public function isPublished(): bool
    {
        return $this->publish_status === 'published';
    }

    // ── Scopes ────────────────────────────────────────────────

    public function scopePending($query)
    {
        return $query->where('publish_status', 'pending');
    }

    public function scopeForClient($query, int $clientId)
    {
        return $query->where('client_id', $clientId);
    }
}
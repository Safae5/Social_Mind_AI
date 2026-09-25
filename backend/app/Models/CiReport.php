<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class CiReport extends Model
{
    protected $table = 'ci_reports';

    protected $fillable = [
        'user_id', 'client_id', 'client_brand', 'client_niche',
        'n_competitors', 'n_posts_analyzed', 'score_menace',
        'pdf_path', 'pdf_url', 'strategy_summary', 'status', 'error_message',
    ];

    protected $casts = [
        'strategy_summary' => 'array',
        'score_menace'     => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function isReady(): bool
    {
        return $this->status === 'ready';
    }

    public function pdfExists(): bool
    {
        return !empty($this->pdf_path) && Storage::disk('public')->exists($this->pdf_path);
    }

    public function threatLevel(): string
    {
        if ($this->score_menace >= 70) return '🔴 Élevée';
        if ($this->score_menace >= 40) return '🟡 Modérée';
        return '🟢 Faible';
    }
}
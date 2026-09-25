<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CsStrategy extends Model
{
    use SoftDeletes;

    protected $table = 'cs_strategies';

    protected $fillable = [
        'user_id', 'client_id', 'client_name', 'niche', 'secteur',
        'audience', 'objectifs', 'plateformes', 'ton',
        'strategie_editoriale', 'tone_of_voice', 'frequence_publication',
        'recommandations_cles', 'corpus_size', 'data_sources',
        'pdf_path', 'status', 'error_message',
    ];

    protected $casts = [
        'plateformes'          => 'array',
        'frequence_publication'=> 'array',
        'recommandations_cles' => 'array',
        'data_sources'         => 'array',
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

    public function pillars(): HasMany
    {
        return $this->hasMany(CsPillar::class, 'cs_strategy_id')->orderBy('pillar_number');
    }

    public function calendars(): HasMany
    {
        return $this->hasMany(CsCalendar::class, 'cs_strategy_id');
    }

    public function hashtagRecs(): HasMany
    {
        return $this->hasMany(CsHashtagRec::class, 'cs_strategy_id')
                    ->orderByDesc('tfidf_score');
    }

    // ── Helpers ───────────────────────────────────────────────

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function hasPdf(): bool
    {
        return !empty($this->pdf_path);
    }
}
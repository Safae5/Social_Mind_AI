<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CsHashtagRec extends Model
{
    protected $table = 'cs_hashtag_recs';

    protected $fillable = [
        'cs_strategy_id', 'hashtag', 'tfidf_score', 'pilier',
    ];

    protected $casts = [
        'tfidf_score' => 'float',
    ];

    public function strategy(): BelongsTo
    {
        return $this->belongsTo(CsStrategy::class, 'cs_strategy_id');
    }

    public function scopeTopScored($query, int $limit = 20)
    {
        return $query->orderByDesc('tfidf_score')->take($limit);
    }
}
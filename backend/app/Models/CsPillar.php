<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CsPillar extends Model
{
    protected $table = 'cs_pillars';

    protected $fillable = [
        'cs_strategy_id', 'pillar_number', 'nom',
        'mots_cles', 'description', 'source_ia', 'hashtags',
    ];

    protected $casts = [
        'mots_cles' => 'array',
        'hashtags'  => 'array',
    ];

    public function strategy(): BelongsTo
    {
        return $this->belongsTo(CsStrategy::class, 'cs_strategy_id');
    }
}
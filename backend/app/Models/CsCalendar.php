<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CsCalendar extends Model
{
    protected $table = 'cs_calendars';

    protected $fillable = [
        'cs_strategy_id', 'jour', 'pilier', 'plateforme',
        'type_contenu', 'sujet', 'angle', 'hashtags',
        'is_published', 'published_at',
    ];

    protected $casts = [
        'hashtags'     => 'array',
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function strategy(): BelongsTo
    {
        return $this->belongsTo(CsStrategy::class, 'cs_strategy_id');
    }

    // Ordre canonique des jours de la semaine
    public const DAYS_ORDER = [
        'Lundi' => 1, 'Mardi' => 2, 'Mercredi' => 3, 'Jeudi' => 4,
        'Vendredi' => 5, 'Samedi' => 6, 'Dimanche' => 7,
    ];
}
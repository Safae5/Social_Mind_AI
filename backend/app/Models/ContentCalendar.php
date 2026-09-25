<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentCalendar extends Model
{
    protected $fillable = [
        'user_id', 'social_account_id',
        'week_start', 'week_end', 'week_number', 'year',
        'niche', 'platforms', 'frequency', 'objectives',
        'coherence_score', 'coherence_level',
        'status', 'is_read',
    ];

    protected $casts = [
        'platforms'  => 'array',
        'objectives' => 'array',
        'week_start' => 'date',
        'week_end'   => 'date',
        'is_read'    => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class);
    }

    public function slots(): HasMany
    {
        return $this->hasMany(CalendarSlot::class)->orderBy('day_index');
    }
}
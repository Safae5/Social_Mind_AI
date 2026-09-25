<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmProphetSlot extends Model
{
    protected $table = 'sm_prophet_slots';

    protected $fillable = [
        'social_account_id',
        'slot_datetime',
        'predicted_score',
        'lower_bound',
        'upper_bound',
        'is_used',
    ];

    protected $casts = [
        'slot_datetime'   => 'datetime',
        'is_used'         => 'boolean',
        'predicted_score' => 'float',
        'lower_bound'     => 'float',
        'upper_bound'     => 'float',
    ];

    // ── Relations ─────────────────────────────────────────────

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SmAccount::class, 'social_account_id');
    }

    // ── Helpers ───────────────────────────────────────────────

    public function markAsUsed(): void
    {
        $this->update(['is_used' => true]);
    }

    public function isAvailable(): bool
    {
        return !$this->is_used && $this->slot_datetime > now();
    }

    // ── Scopes ────────────────────────────────────────────────

    public function scopeAvailable($query)
    {
        return $query->where('is_used', false)
                     ->where('slot_datetime', '>', now());
    }

    public function scopeForAccount($query, int $accountId)
    {
        return $query->where('social_account_id', $accountId);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('slot_datetime', '>', now())
                     ->orderBy('slot_datetime');
    }

    /**
     * Retourne le prochain créneau disponible pour un compte.
     */
    public static function nextAvailableFor(int $accountId): ?self
    {
        return static::forAccount($accountId)
            ->available()
            ->upcoming()
            ->first();
    }
}
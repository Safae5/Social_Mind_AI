<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'name', 'slug', 'description', 'type',
        'price_monthly', 'price_yearly', 'currency',
        'stripe_price_id_monthly', 'stripe_price_id_yearly', 'stripe_product_id',
        'features', 'limits',
        'has_trial', 'trial_days',
        'is_active', 'is_featured', 'sort_order', 'color',
    ];

    protected $casts = [
        'price_monthly' => 'decimal:2',
        'price_yearly'  => 'decimal:2',
        'features'      => 'array',
        'limits'        => 'array',
        'has_trial'     => 'boolean',
        'is_active'     => 'boolean',
        'is_featured'   => 'boolean',
    ];

    // ── Scopes ────────────────────────────────────────────────────
    public function scopeActive($query)   { return $query->where('is_active', true); }
    public function scopeStandard($query) { return $query->where('type', 'standard'); }
    public function scopeBusiness($query) { return $query->where('type', 'business'); }

    // ── Helpers ───────────────────────────────────────────────────
    public function hasFeature(string $feature): bool
    {
        return in_array($feature, $this->features ?? []);
    }

    public function getLimit(string $key, int $default = 0): int
    {
        return $this->limits[$key] ?? $default;
    }

    public function isFree(): bool { return $this->price_monthly == 0; }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    protected $fillable = [
        'user_id', 'plan_id',
        'stripe_subscription_id', 'stripe_customer_id',
        'source', 'granted_by',
        'billing_cycle', 'status',
        'trial_starts_at', 'trial_ends_at',
        'starts_at', 'ends_at',
        'canceled_at', 'grace_period_ends_at',
        'auto_renew', 'next_billing_at', 'next_billing_amount',
        'cancel_reason', 'cancel_feedback',
    ];

    protected $casts = [
        'trial_starts_at'       => 'datetime',
        'trial_ends_at'         => 'datetime',
        'starts_at'             => 'datetime',
        'ends_at'               => 'datetime',
        'canceled_at'           => 'datetime',
        'grace_period_ends_at'  => 'datetime',
        'next_billing_at'       => 'datetime',
        'auto_renew'            => 'boolean',
        'next_billing_amount'   => 'decimal:2',
    ];

    // ── Helpers statut ────────────────────────────────────────────
    public function isActive(): bool    { return $this->status === 'active'; }
    public function isTrialing(): bool  { return $this->status === 'trialing'; }
    public function isCanceled(): bool  { return $this->status === 'canceled'; }
    public function isPastDue(): bool   { return $this->status === 'past_due'; }

    public function isValid(): bool
    {
        return in_array($this->status, ['active', 'trialing'])
            && (!$this->ends_at || $this->ends_at->isFuture());
    }

    public function daysRemaining(): int
    {
        if (!$this->ends_at) return 0;
        return max(0, now()->diffInDays($this->ends_at, false));
    }

    public function isAdminGranted(): bool { return $this->source === 'admin_manual'; }

    // ── Relations ─────────────────────────────────────────────────
    public function user()   { return $this->belongsTo(User::class); }
    public function plan()   { return $this->belongsTo(Plan::class); }
    public function invoices() { return $this->hasMany(Invoice::class); }
    public function grantedBy() { return $this->belongsTo(User::class, 'granted_by'); }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'user_id', 'subscription_id', 'invoice_number', 'stripe_invoice_id',
        'subtotal', 'tax', 'total', 'currency', 'status',
        'issued_at', 'due_at', 'paid_at',
        'refunded_at', 'refund_amount', 'refunded_by',
        'pdf_url', 'line_items', 'notes',
    ];

    protected $casts = [
        'subtotal'      => 'decimal:2',
        'tax'           => 'decimal:2',
        'total'         => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'issued_at'     => 'datetime',
        'due_at'        => 'datetime',
        'paid_at'       => 'datetime',
        'refunded_at'   => 'datetime',
        'line_items'    => 'array',
    ];

    public function isRefunded(): bool
    {
        return !is_null($this->refunded_at);
    }

    public function isRefundable(): bool
    {
        return $this->status === 'paid' && !$this->isRefunded() && $this->stripe_invoice_id;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function refundedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'refunded_by');
    }
}

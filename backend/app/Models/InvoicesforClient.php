<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class InvoicesforClient extends Model
{
    use SoftDeletes;

    protected $table = 'invoicesforClient';

    protected $fillable = [
        'user_id', 'client_id', 'invoice_number', 'line_items',
        'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency',
        'status', 'issue_date', 'due_date', 'paid_date',
        'notes', 'stripe_payment_intent_id', 'pdf_path',
    ];

    protected $casts = [
        'line_items' => 'array',
        'issue_date' => 'date',
        'due_date'   => 'date',
        'paid_date'  => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function isOverdue(): bool
    {
        return $this->status === 'sent' && $this->due_date->isPast();
    }

    protected static function booted(): void
    {
        static::creating(function ($invoice) {
            if (!$invoice->invoice_number) {
                $invoice->invoice_number = 'INV-' . date('Y') . '-' . str_pad(
                    static::where('user_id', $invoice->user_id)->count() + 1,
                    4, '0', STR_PAD_LEFT
                );
            }
        });
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class AnReport extends Model
{
    protected $table = 'an_reports';

    protected $fillable = [
        'user_id', 'sm_account_id', 'client_id',
        'report_type', 'period_label', 'period_start', 'period_end',
        'pdf_path', 'pdf_url', 'kpis_summary', 'status', 'error_message',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end'   => 'date',
        'kpis_summary' => 'array',
    ];

    // ── Relations ─────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function smAccount(): BelongsTo
    {
        return $this->belongsTo(SmAccount::class, 'sm_account_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    // ── Helpers ───────────────────────────────────────────────

    public function isReady(): bool
    {
        return $this->status === 'ready';
    }

    public function pdfExists(): bool
    {
        return !empty($this->pdf_path) && Storage::disk('public')->exists($this->pdf_path);
    }
}
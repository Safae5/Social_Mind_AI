<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class AoReport extends Model
{
    protected $table = 'ao_reports';

    protected $fillable = [
        'user_id', 'client_id', 'client_name', 'report_type',
        'period_start', 'period_end', 'pdf_path', 'pdf_url',
        'kpis_summary', 'roas_before', 'roas_after', 'roas_improvement_pct',
        'status', 'error_message',
    ];

    protected $casts = [
        'period_start'         => 'date',
        'period_end'           => 'date',
        'kpis_summary'         => 'array',
        'roas_before'          => 'float',
        'roas_after'           => 'float',
        'roas_improvement_pct' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function isReady(): bool
    {
        return $this->status === 'ready';
    }

    public function pdfExists(): bool
    {
        return !empty($this->pdf_path) && Storage::disk('public')->exists($this->pdf_path);
    }
}
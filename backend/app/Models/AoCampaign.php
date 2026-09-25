<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AoCampaign extends Model
{
    protected $table = 'ao_campaigns';

    protected $fillable = [
        'user_id', 'client_id', 'campaign_id', 'campaign_name',
        'platform', 'ad_type', 'audience_age', 'audience_gender',
        'impressions', 'clicks', 'spend', 'conversions', 'revenue',
        'ctr', 'cpc', 'cpa', 'roas', 'cpm', 'performance_score',
        'status', 'date_start', 'date_end', 'source',
    ];

    protected $casts = [
        'date_start' => 'date',
        'date_end'   => 'date',
        'spend'      => 'float',
        'revenue'    => 'float',
        'ctr'        => 'float',
        'roas'       => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    // ── Scopes ────────────────────────────────────────────────

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForClient($query, int $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    public function scopePlatform($query, string $platform)
    {
        return $query->where('platform', $platform);
    }

    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('date_start', '>=', now()->subDays($days)->toDateString());
    }

    public function isTopPerformer(): bool
    {
        return $this->status === 'Top Performer';
    }

    public function isUnderperforming(): bool
    {
        return in_array($this->status, ['CTR Faible', 'ROAS Négatif', 'CPA Élevé']);
    }
}
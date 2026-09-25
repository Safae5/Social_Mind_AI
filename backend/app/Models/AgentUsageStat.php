<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentUsageStat extends Model
{
    protected $fillable = [
        'agent_name', 'user_id', 'date',
        'total_calls', 'failed_calls', 'api_cost_usd', 'tokens_used', 'avg_latency_ms',
    ];

    protected $casts = [
        'date'          => 'date',
        'api_cost_usd'  => 'decimal:4',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

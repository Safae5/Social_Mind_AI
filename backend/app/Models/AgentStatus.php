<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AgentStatus extends Model
{
    protected $fillable = [
        'agent_name', 'status', 'latency_ms',
        'memory_mb', 'cpu_percent', 'queue_depth',
        'last_error', 'enabled', 'last_seen',
    ];

    protected $casts = [
        'enabled'   => 'boolean',
        'last_seen' => 'datetime',
    ];

    public function isOnline(): bool   { return $this->status === 'online'; }
    public function hasError(): bool   { return $this->status === 'error'; }
    public function isDisabled(): bool { return !$this->enabled; }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentModelConfig extends Model
{
    protected $fillable = [
        'agent_slug', 'config_key', 'current_value', 'desired_value', 'applied', 'updated_by',
    ];

    protected $casts = [
        'applied' => 'boolean',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

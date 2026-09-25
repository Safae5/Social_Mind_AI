<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientWorkspace extends Model
{
    protected $fillable = [
        'user_id', 'client_id', 'name', 'description',
        'settings', 'connected_platforms', 'agents_active', 'status',
    ];

    protected $casts = [
        'settings'            => 'array',
        'connected_platforms' => 'array',
        'agents_active'       => 'boolean',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
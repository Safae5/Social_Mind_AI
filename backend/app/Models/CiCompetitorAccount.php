<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CiCompetitorAccount extends Model
{
    protected $table = 'ci_competitor_accounts';

    protected $fillable = [
        'user_id', 'client_id', 'name', 'platform', 'username',
        'platform_id', 'profile_url', 'avatar_url', 'is_active',
        'followers_count', 'description', 'extra_data', 'last_scraped_at',
    ];

    protected $casts = [
        'is_active'      => 'boolean',
        'extra_data'     => 'array',
        'last_scraped_at'=> 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(CiCompetitorPost::class, 'ci_competitor_account_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForClient($query, int $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    public function postsCount(): int
    {
        return $this->posts()->count();
    }
}
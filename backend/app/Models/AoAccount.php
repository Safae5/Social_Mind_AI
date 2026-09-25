<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AoAccount extends Model
{
    protected $table = 'ao_accounts';

    protected $fillable = [
        'user_id', 'client_id', 'platform', 'platform_account_id',
        'account_name', 'access_token', 'refresh_token',
        'token_expires_at', 'is_active', 'meta_data',
    ];

    protected $hidden = ['access_token', 'refresh_token'];

    protected $casts = [
        'is_active'        => 'boolean',
        'meta_data'        => 'array',
        'token_expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(AoCampaign::class, 'user_id', 'user_id')
                    ->where('platform', $this->platform);
    }

    public function getDecryptedAccessToken(): string
    {
        return decrypt($this->access_token);
    }

    public function setAccessTokenAttribute(?string $value): void
    {
        $this->attributes['access_token'] = $value ? encrypt($value) : null;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForClient($query, int $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    public function isMeta(): bool
    {
        return $this->platform === 'meta';
    }

    public function isGoogle(): bool
    {
        return $this->platform === 'google';
    }
}
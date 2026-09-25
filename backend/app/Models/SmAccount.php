<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SmAccount extends Model
{
    protected $table = 'sm_accounts';

    protected $fillable = [
        'user_id',
        'client_id',
        'platform',
        'account_id',
        'account_name',
        'account_handle',
        'account_type',
        'access_token',
        'ig_user_id',
        'token_expires_at',
        'is_active',
        'token_valid',
        'page_id',
        'meta_data',
    ];

    protected $hidden = ['access_token'];

    protected $casts = [
        'is_active'        => 'boolean',
        'token_valid'      => 'boolean',
        'meta_data'        => 'array',
        'token_expires_at' => 'datetime',
    ];

    // ── Relations ─────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function contentQueue(): HasMany
    {
        return $this->hasMany(SmContentQueue::class, 'social_account_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(SmCommentInbox::class, 'social_account_id');
    }

    public function metrics(): HasMany
    {
        return $this->hasMany(SmEngagementMetric::class, 'social_account_id');
    }

    public function prophetSlots(): HasMany
    {
        return $this->hasMany(SmProphetSlot::class, 'social_account_id');
    }

    // ── Helpers ───────────────────────────────────────────────

    /**
     * Retourne le token déchiffré.
     * Utilisé uniquement côté serveur — jamais exposé au frontend.
     */
    public function getDecryptedAccessToken(): string
    {
        return decrypt($this->access_token);
    }

    /** Chiffre automatiquement le token à l'écriture — symétrique à getDecryptedAccessToken(). */
    public function setAccessTokenAttribute(?string $value): void
    {
        $this->attributes['access_token'] = $value ? encrypt($value) : null;
    }

    // ── Scopes ────────────────────────────────────────────────

    /** Comptes actifs avec token valide. */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('token_valid', true);
    }

    /** Comptes d'un client spécifique (professionnel). */
    public function scopeForClient($query, int $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    /** Comptes du standard user (sans client). */
    public function scopeStandard($query)
    {
        return $query->whereNull('client_id');
    }

    /** Vérifie si le compte appartient à un professionnel. */
    public function isOwnedByProfessional(): bool
    {
        return !is_null($this->client_id);
    }
}
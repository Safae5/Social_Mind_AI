<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Crypt;

class SocialAccount extends Model
{
    use SoftDeletes;

    protected $fillable = [
        // ── Colonnes OAuth login originales ───────────────────
        'user_id',
        'provider',
        'provider_id',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'nickname',
        'name',
        'email',
        'avatar',

        // ── Nouvelles colonnes Agent 1 ─────────────────────────
        'platform',
        'platform_user_id',
        'platform_username',
        'platform_display_name',
        'platform_avatar_url',
        'page_id',
        'page_name',
        'page_access_token',
        'token_refreshed_at',
        'followers_count',
        'following_count',
        'posts_count',
        'account_type',
        'is_active',
        'token_valid',
        'token_error',
        'last_synced_at',
        'granted_permissions',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
        'page_access_token',
    ];

    protected $casts = [
        'token_expires_at'    => 'datetime',
        'token_refreshed_at'  => 'datetime',
        'last_synced_at'      => 'datetime',
        'is_active'           => 'boolean',
        'token_valid'         => 'boolean',
        'granted_permissions' => 'array',
    ];

    // ══════════════════════════════════════════════════════════
    // RELATIONS
    // ══════════════════════════════════════════════════════════

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contentQueue(): HasMany
    {
        return $this->hasMany(ContentQueue::class);
    }

    public function scheduledPosts(): HasMany
    {
        return $this->hasMany(ScheduledPost::class);
    }

    public function optimalSlots(): HasMany
    {
        return $this->hasMany(OptimalSlot::class);
    }

    // ══════════════════════════════════════════════════════════
    // RECONNEXION APRÈS DÉCONNEXION (SoftDeletes)
    // ══════════════════════════════════════════════════════════

    /**
     * Équivalent de updateOrCreate() mais qui restaure une ligne "trashed"
     * au lieu d'échouer sur unique(user_id, provider) / unique(user_id,
     * platform, platform_user_id). updateOrCreate() seul ne voit jamais les
     * lignes soft-deleted (scope global), donc reconnecter un compte
     * Instagram/Facebook/TikTok déjà déconnecté une fois tentait toujours
     * un INSERT en double de l'ancienne ligne "trashed" toujours présente
     * en base — la contrainte unique bloquait alors CHAQUE reconnexion,
     * pas seulement la première après déconnexion.
     */
    public static function updateOrCreateWithTrashed(array $match, array $values): self
    {
        $account = static::withTrashed()->where($match)->first();

        if ($account) {
            if ($account->trashed()) {
                $account->restore();
            }
            $account->update($values);
            return $account;
        }

        return static::create(array_merge($match, $values));
    }

    // ══════════════════════════════════════════════════════════
    // TOKEN MANAGEMENT (chiffrement/déchiffrement)
    // ══════════════════════════════════════════════════════════

    public function getDecryptedAccessToken(): ?string
    {
        if (!$this->access_token) return null;
        try {
            return Crypt::decryptString($this->access_token);
        } catch (\Exception $e) {
            // Peut être un token non chiffré (anciens comptes OAuth)
            return $this->access_token;
        }
    }

    public function getDecryptedRefreshToken(): ?string
    {
        if (!$this->refresh_token) return null;
        try {
            return Crypt::decryptString($this->refresh_token);
        } catch (\Exception $e) {
            return $this->refresh_token;
        }
    }

    public function getDecryptedPageAccessToken(): ?string
    {
        if (!$this->page_access_token) return null;
        try {
            return Crypt::decryptString($this->page_access_token);
        } catch (\Exception $e) {
            return $this->page_access_token;
        }
    }

    // Setters avec chiffrement automatique
    public function setAccessTokenAttribute(?string $value): void
    {
        $this->attributes['access_token'] = $value
            ? Crypt::encryptString($value)
            : null;
    }

    public function setRefreshTokenAttribute(?string $value): void
    {
        $this->attributes['refresh_token'] = $value
            ? Crypt::encryptString($value)
            : null;
    }

    public function setPageAccessTokenAttribute(?string $value): void
    {
        $this->attributes['page_access_token'] = $value
            ? Crypt::encryptString($value)
            : null;
    }

    // ══════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════

    /**
     * C'est un compte OAuth login (Google/Facebook Auth) ?
     */
    public function isOAuthLogin(): bool
    {
        return in_array($this->provider, ['google', 'facebook'])
            && $this->account_type === 'oauth_login';
    }

    /**
     * Compte Instagram connecté via "Instagram API with Instagram Login"
     * (pas de Page Facebook liée) plutôt que via le flux Facebook Login
     * habituel. Jeton et espace d'ID incompatibles avec graph.facebook.com —
     * confirmé en direct : un jeton Instagram Login est rejeté par
     * graph.facebook.com ("Cannot parse access token"). Les consommateurs
     * (Jobs → AI Engine) doivent router vers graph.instagram.com pour ces
     * comptes.
     */
    public function isInstagramDirectLogin(): bool
    {
        return $this->platform === 'instagram' && $this->provider === 'platform_instagram_direct';
    }

    /**
     * C'est un compte réseau social (Instagram/TikTok pour publier) ?
     */
    public function isSocialMediaAccount(): bool
    {
        return in_array($this->platform ?? $this->provider, [
            'instagram', 'tiktok', 'facebook',
        ]) && $this->account_type !== 'oauth_login';
    }

    /**
     * Retourne le nom d'affichage selon le type de compte.
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->platform_display_name
            ?? $this->platform_username
            ?? $this->name
            ?? $this->nickname
            ?? 'Compte inconnu';
    }

    /**
     * Retourne l'avatar selon le type de compte.
     */
    public function getAvatarUrlAttribute(): ?string
    {
        return $this->platform_avatar_url ?? $this->avatar;
    }

    /**
     * Retourne la plateforme unifiée.
     */
    public function getPlatformNameAttribute(): string
    {
        return $this->platform ?? $this->provider ?? 'unknown';
    }

    public function isTokenExpired(): bool
    {
        if (!$this->token_expires_at) return false;
        return $this->token_expires_at->isPast();
    }

    public function isTokenExpiringSoon(int $hoursThreshold = 24): bool
    {
        if (!$this->token_expires_at) return false;
        return $this->token_expires_at->diffInHours(now()) <= $hoursThreshold;
    }

    public function markTokenInvalid(string $error = ''): void
    {
        $this->update(['token_valid' => false, 'token_error' => $error]);
    }

    public function markTokenValid(): void
    {
        $this->update([
            'token_valid'        => true,
            'token_error'        => null,
            'token_refreshed_at' => now(),
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // SCOPES
    // ══════════════════════════════════════════════════════════

    /**
     * Comptes actifs avec token valide (pour publier).
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('token_valid', true);
    }

    /**
     * Uniquement les comptes réseaux sociaux (pas OAuth login).
     */
    public function scopeSocialMedia($query)
    {
        return $query->whereIn('platform', ['instagram', 'facebook', 'tiktok'])
                     ->where('account_type', '!=', 'oauth_login');
    }

    /**
     * Uniquement les comptes OAuth login (Google/Facebook auth).
     */
    public function scopeOAuthLogin($query)
    {
        return $query->where('account_type', 'oauth_login');
    }

    public function scopeForPlatform($query, string $platform)
    {
        return $query->where('platform', $platform);
    }

    public function scopeNeedsSync($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('last_synced_at')
              ->orWhere('last_synced_at', '<', now()->subHours(6));
        });
    }
}
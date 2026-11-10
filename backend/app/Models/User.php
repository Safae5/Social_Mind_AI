<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        // ── Infos de base ──────────────────────────────────────
        'first_name',
        'last_name',
        'email',
        'phone',
        'password',
        'avatar',
        'role',
        'status',
        'email_verified_at', // manquait — voir EmailVerificationService::verify()
                             // et OAuthService::createUserFromOAuth() : sans ça,
                             // update()/create() droppaient silencieusement ce
                             // champ (mass-assignment), donc isEmailVerified()
                             // restait faux à vie même après vérification réussie.

        // ── 2FA ────────────────────────────────────────────────
        'two_factor_enabled',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',

        // ── Abonnement ─────────────────────────────────────────
        'current_plan',
        'trial_ends_at',
        'stripe_customer_id',

        // ── Préférences ────────────────────────────────────────
        'locale',
        'timezone',
        'preferences',

        // ── Connexion ──────────────────────────────────────────
        'last_login_ip',
        'last_login_at',
        'login_count',

        // ── Nouveaux champs Agent 1 (add_profile_fields) ───────
        'profile_type',
        'brand_niche',
        'connected_platforms',
        'primary_objective',
        'post_frequency',
        'accounts_count',
        'content_categories',
        'brand_tone',
        'brand_examples',
        'onboarding_completed',
        'onboarding_completed_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected $casts = [
        // ── Dates ──────────────────────────────────────────────
        'email_verified_at'       => 'datetime',
        'trial_ends_at'           => 'datetime',
        'last_login_at'           => 'datetime',
        'two_factor_confirmed_at' => 'datetime',
        'onboarding_completed_at' => 'datetime',

        // ── Booléens ───────────────────────────────────────────
        'two_factor_enabled'  => 'boolean',
        'onboarding_completed'=> 'boolean',

        // ── JSON ───────────────────────────────────────────────
        'two_factor_recovery_codes' => 'array',
        'preferences'               => 'array',
        'connected_platforms'       => 'array',
        'content_categories'        => 'array',
        'brand_examples'            => 'array',

        // ── Entiers ────────────────────────────────────────────
        'login_count' => 'integer',
    ];

    // ══════════════════════════════════════════════════════════
    // JWT — requis par tymon/jwt-auth
    // ══════════════════════════════════════════════════════════

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'role'         => $this->role,
            'email'        => $this->email,
            'current_plan' => $this->current_plan,
        ];
    }

    // ══════════════════════════════════════════════════════════
    // ACCESSEURS
    // ══════════════════════════════════════════════════════════

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function getAvatarUrlAttribute(): string
    {
        if ($this->avatar) return $this->avatar;
        $name = urlencode($this->full_name);
        return "https://ui-avatars.com/api/?name={$name}&background=534AB7&color=fff";
    }

    // ══════════════════════════════════════════════════════════
    // HELPERS — Rôles et statuts
    // ══════════════════════════════════════════════════════════

    public function isAdmin(): bool    { return $this->role === 'admin'; }
    public function isBusiness(): bool { return $this->role === 'business'; }
    public function isStandard(): bool { return $this->role === 'standard'; }
    public function isActive(): bool   { return $this->status === 'active'; }

    public function isEmailVerified(): bool
    {
        return !is_null($this->email_verified_at);
    }

    public function isOnTrial(): bool
    {
        return $this->current_plan === 'free_trial'
            && $this->trial_ends_at
            && $this->trial_ends_at->isFuture();
    }

    public function hasActiveSubscription(): bool
    {
        return $this->subscriptions()
            ->whereIn('status', ['active', 'trialing'])
            ->exists();
    }

    public function getDashboardPath(): string
    {
        return match($this->role) {
            'admin'    => '/admin',
            'business' => '/dashboard/professional',
            default    => '/dashboard',
        };
    }

    // ══════════════════════════════════════════════════════════
    // HELPERS — 2FA
    // ══════════════════════════════════════════════════════════

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_enabled
            && !is_null($this->two_factor_secret)
            && !is_null($this->two_factor_confirmed_at);
    }

    public function requiresTwoFactor(): bool
    {
        return $this->isAdmin() && $this->hasTwoFactorEnabled();
    }

    // ══════════════════════════════════════════════════════════
    // HELPERS — Onboarding (Agent 1)
    // ══════════════════════════════════════════════════════════

    public function hasCompletedOnboarding(): bool
    {
        return (bool) $this->onboarding_completed;
    }

    public function needsOnboarding(): bool
    {
        return $this->isStandard() && !$this->onboarding_completed;
    }

    /**
     * Retourne le nombre de comptes sociaux connectés pour la publication.
     */
    public function countConnectedSocialAccounts(): int
    {
        return $this->socialMediaAccounts()->active()->count();
    }

    /**
     * Vérifie si l'utilisateur peut encore connecter des comptes (max 2).
     */
    public function canConnectMoreAccounts(): bool
    {
        return $this->countConnectedSocialAccounts() < 2;
    }

    /**
     * Retourne la niche principale ou une valeur par défaut.
     */
    public function getBrandNicheOrDefault(): string
    {
        return $this->brand_niche ?? 'général';
    }

    /**
     * Retourne les plateformes connectées ou un tableau vide.
     */
    public function getConnectedPlatformsOrDefault(): array
    {
        return $this->connected_platforms ?? [];
    }

    /**
     * Retourne la fréquence de publication sous forme d'entier.
     */
    public function getPostFrequencyAsInt(): int
    {
        return match($this->post_frequency) {
            'never'    => 0,
            '1-2/week' => 1,
            '3-5/week' => 4,
            'daily'    => 7,
            default    => 5,
        };
    }

    // ══════════════════════════════════════════════════════════
    // RELATIONS — Auth et sessions
    // ══════════════════════════════════════════════════════════

    public function emailVerificationTokens(): HasMany
    {
        return $this->hasMany(EmailVerificationToken::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(UserSession::class);
    }

    public function twoFactorSessions(): HasMany
    {
        return $this->hasMany(TwoFactorSession::class);
    }

    // ══════════════════════════════════════════════════════════
    // RELATIONS — Comptes sociaux (table social_accounts fusionnée)
    // ══════════════════════════════════════════════════════════

    /**
     * Tous les enregistrements social_accounts (OAuth + réseaux sociaux).
     */
    public function socialAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class);
    }

    /**
     * Uniquement les comptes OAuth login (Google, Facebook auth).
     * Utilisé par OAuthController pour linkAccount/unlinkAccount.
     */
    public function oauthAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class)
                    ->where(function ($q) {
                        $q->where('account_type', 'oauth_login')
                          ->orWhereNull('platform');
                    });
    }

    /**
     * Uniquement les comptes réseaux sociaux pour publication
     * (Instagram, TikTok, Facebook page — Agent 1).
     * Remplace l'ancienne relation socialMediaAccounts() qui pointait
     * vers SocialMediaAccount (table différente).
     */
    public function socialMediaAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class)
                    ->whereNotNull('platform')
                    ->where('account_type', '!=', 'oauth_login');
    }

    /**
     * Comptes réseaux sociaux actifs uniquement.
     */
    public function activeSocialAccounts(): HasMany
    {
        return $this->socialMediaAccounts()
                    ->where('is_active', true)
                    ->where('token_valid', true);
    }

    /**
     * Comptes Social Manager (Agent 5 : Analytics IA — collecte Meta Graph API).
     * Relation absente jusqu'ici : routes/console.php appelait déjà
     * whereHas('smAccounts', ...) dans les tâches planifiées de collecte, ce
     * qui levait "Call to undefined method User::smAccounts()" à chaque
     * exécution — confirmé en reproduisant en direct avec schedule:test.
     */
    public function smAccounts(): HasMany
    {
        return $this->hasMany(SmAccount::class);
    }

    /**
     * Comptes Ad Optimizer (Agent 6). Même défaut que smAccounts() ci-dessus.
     */
    public function aoAccounts(): HasMany
    {
        return $this->hasMany(AoAccount::class);
    }

    /**
     * Comptes concurrents suivis par Competitive Intel (Agent 7). Même
     * défaut que smAccounts() ci-dessus.
     */
    public function ciCompetitorAccounts(): HasMany
    {
        return $this->hasMany(CiCompetitorAccount::class);
    }

    // ══════════════════════════════════════════════════════════
    // RELATIONS — Abonnements et facturation
    // ══════════════════════════════════════════════════════════

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)
                    ->whereIn('status', ['active', 'trialing'])
                    ->latest();
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    // ══════════════════════════════════════════════════════════
    // RELATIONS — Contenu et planification (Agent 1)
    // ══════════════════════════════════════════════════════════

    public function scheduledPosts(): HasMany
    {
        return $this->hasMany(ScheduledPost::class);
    }

    public function contentQueue(): HasMany
    {
        return $this->hasMany(ContentQueue::class);
    }

    public function optimalSlots(): HasMany
    {
        return $this->hasMany(OptimalSlot::class);
    }

    // ══════════════════════════════════════════════════════════
    // RELATIONS — Autres
    // ══════════════════════════════════════════════════════════

    public function clientProfiles(): HasMany
    {
        return $this->hasMany(ClientProfile::class);
    }

    public function agentUsageStats(): HasMany
    {
        return $this->hasMany(AgentUsageStat::class);
    }
}
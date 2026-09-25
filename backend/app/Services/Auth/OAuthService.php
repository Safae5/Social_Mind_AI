<?php

namespace App\Services\Auth;
use App\Models\EmailVerificationToken;
use App\Models\Plan;
use App\Models\SocialAccount;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\Auth\WelcomeNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as SocialiteUser;

class OAuthService
{
    public function __construct(
        private readonly SessionService $sessionService,
        private readonly JwtService     $jwtService
    ) {}

    // ── Point d'entrée principal ──────────────────────────────────
    // Trouve ou crée un utilisateur depuis les données OAuth
    public function findOrCreateUser(
        SocialiteUser $socialiteUser,
        string        $provider
    ): User {

        // 1. Cherche un compte OAuth existant pour ce provider
        $socialAccount = SocialAccount::where('provider', $provider)
            ->where('provider_id', $socialiteUser->getId())
            ->first();

        if ($socialAccount) {
            // Mise à jour du token OAuth
            $socialAccount->update([
                'access_token'  => $socialiteUser->token,
                'refresh_token' => $socialiteUser->refreshToken ?? null,
            ]);
            return $socialAccount->user;
        }

        // 2. Cherche un utilisateur avec le même email
        $existingUser = User::where('email', $socialiteUser->getEmail())->first();

        if ($existingUser) {
            // Lie le compte OAuth au compte existant
            $this->linkSocialAccount($existingUser, $socialiteUser, $provider);
            return $existingUser;
        }

        // 3. Crée un nouvel utilisateur
        return $this->createUserFromOAuth($socialiteUser, $provider);
    }

    // ── Lie un compte OAuth à un utilisateur existant ─────────────
    public function linkSocialAccount(
        User          $user,
        SocialiteUser $socialiteUser,
        string        $provider
    ): SocialAccount {
        return SocialAccount::updateOrCreate(
            [
                'user_id'     => $user->id,
                'provider'    => $provider,
            ],
            [
                'provider_id'   => $socialiteUser->getId(),
                'access_token'  => $socialiteUser->token,
                'refresh_token' => $socialiteUser->refreshToken ?? null,
                'name'          => $socialiteUser->getName(),
                'email'         => $socialiteUser->getEmail(),
                'avatar'        => $socialiteUser->getAvatar(),
            ]
        );
    }

    // ── Crée un nouvel utilisateur depuis OAuth ───────────────────
    private function createUserFromOAuth(
        SocialiteUser $socialiteUser,
        string        $provider
    ): User {

        // Parse le nom complet
        $nameParts = explode(' ', $socialiteUser->getName(), 2);
        $firstName = $nameParts[0] ?? 'Utilisateur';
        $lastName  = $nameParts[1] ?? 'OAuth';

        // Crée l'utilisateur
        $user = User::create([
            'first_name'        => $firstName,
            'last_name'         => $lastName,
            'email'             => $socialiteUser->getEmail(),
            'avatar'            => $socialiteUser->getAvatar(),
            'password'          => Hash::make(Str::random(32)), // mot de passe aléatoire
            'role'              => 'standard', // rôle par défaut
            'status'            => 'active',   // pas besoin de vérifier l'email via OAuth
            'email_verified_at' => now(),      // email déjà vérifié par le provider
            'current_plan'      => 'free_trial',
            'trial_ends_at'     => now()->addDays(30),
        ]);

        // Crée l'abonnement essai gratuit
        $freePlan = Plan::where('slug', 'free_trial')->first();
        if ($freePlan) {
            Subscription::create([
                'user_id'         => $user->id,
                'plan_id'         => $freePlan->id,
                'billing_cycle'   => 'trial',
                'status'          => 'trialing',
                'trial_starts_at' => now(),
                'trial_ends_at'   => now()->addDays(30),
                'starts_at'       => now(),
                'ends_at'         => now()->addDays(30),
            ]);
        }

        // Lie le compte OAuth
        $this->linkSocialAccount($user, $socialiteUser, $provider);

        // Envoie l'email de bienvenue
        $user->notify(new WelcomeNotification($user->first_name, $user->role));

        return $user;
    }

    // ── Génère les tokens après OAuth (même mécanisme que le login classique) ─
    public function generateTokens(
    User   $user,
    string $ip,
    string $userAgent
): array {
    $tokens = $this->jwtService->generateTokenPair($user);

    $user->update([
        'last_login_at' => now(),
        'last_login_ip' => $ip,
        'login_count'   => (int) $user->login_count + 1,
    ]);

    // ── int obligatoire pour Carbon ───────────────────────────
    $expiration = now()->addDays(7);
    $this->sessionService->createSession(
        $user,
        $tokens['refresh_token_id'],
        $ip,
        $userAgent,
        $expiration
    );

    return $tokens;
}
}
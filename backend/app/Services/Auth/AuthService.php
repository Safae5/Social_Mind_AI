<?php

namespace App\Services\Auth;

use App\Models\EmailVerificationToken;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\Auth\VerifyEmailNotification;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function __construct(
        private readonly SessionService $sessionService,
        private readonly JwtService     $jwtService
    ) {}

    // ── Inscription ───────────────────────────────────────────────
    public function register(array $data): array
    {
        $user = User::create([
            'first_name'    => $data['first_name'],
            'last_name'     => $data['last_name'],
            'email'         => $data['email'],
            'phone'         => $data['phone'] ?? null,
            'password'      => Hash::make($data['password']),
            'role'          => $data['role'],
            'status'        => 'inactive',
            'current_plan'  => 'free_trial',
            'trial_ends_at' => now()->addDays(30),
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

        // Envoie l'email de vérification
        $token = EmailVerificationToken::generateFor($user);
        $user->notify(new VerifyEmailNotification($token->token, $user->first_name));

        return [
            'user'    => $user,
            'message' => 'Inscription réussie. Vérifiez votre e-mail.',
        ];
    }

    // ── Connexion ─────────────────────────────────────────────────
   public function login(array $data, string $ip, string $userAgent): array
{
    $user = User::where('email', $data['email'])->first();

    if (!$user || !Hash::check($data['password'], $user->password)) {
        throw new \Exception('Identifiants incorrects.', 401);
    }

    if (in_array($user->status, ['suspended', 'banned'])) {
        throw new \Exception('Votre compte a été suspendu.', 403);
    }

    if (!$user->isEmailVerified()) {
        throw new \Exception('Veuillez vérifier votre adresse e-mail.', 403);
    }

    // ── Génère les tokens ─────────────────────────────────────
    $tokens = $this->jwtService->generateTokenPair($user);

    // ── Met à jour les infos de connexion ────────────────────
    $user->update([
        'last_login_ip' => $ip,
        'last_login_at' => now(),
        'login_count'   => (int) $user->login_count + 1,
    ]);

    // ── Durée de session (int obligatoire pour Carbon) ────────
    $sessionDays  = (isset($data['remember']) && $data['remember']) ? 30 : 7;
    $sessionExpiration = now()->addDays($sessionDays);

    // ── Enregistre la session ─────────────────────────────────
    $this->sessionService->createSession(
        $user,
        $tokens['refresh_token_id'],
        $ip,
        $userAgent,
        $sessionExpiration
    );

    $user->load('activeSubscription.plan');

    return array_merge($tokens, ['user' => $user]);
}

    // ── Déconnexion ───────────────────────────────────────────────
    public function logout(User $user, ?string $token = null): void
    {
        // Invalide le JWT (blacklist)
        if ($token) {
            $this->jwtService->invalidateToken($token);
        }

        // Supprime le refresh token Sanctum actuel
        $user->tokens()
            ->where('name', 'like', 'refresh_token_%')
            ->latest()
            ->first()
            ?->delete();

        // Met à jour la session
        $this->sessionService->endCurrentSession($user);
    }

    // ── Déconnexion de tous les appareils ─────────────────────────
    public function logoutAll(User $user): void
    {
        // Révoque tous les refresh tokens Sanctum
        $user->tokens()->delete();

        // Supprime toutes les sessions
        $user->sessions()->delete();

        // Note : les JWT actifs expireront naturellement (blacklist non globale)
        // Pour invalider tous les JWT, utilise la rotation de secret (avancé)
    }

    // ── Refresh access token ──────────────────────────────────────
    public function refreshAccessToken(string $refreshToken, User $user): array
    {
        // Génère un nouveau JWT access token
        $newAccessToken = $this->jwtService->generateTokenPair($user);

        // Met à jour last_active dans la session
        $user->sessions()
            ->where('is_current', true)
            ->update(['last_active_at' => now()]);

        return $newAccessToken;
    }
}
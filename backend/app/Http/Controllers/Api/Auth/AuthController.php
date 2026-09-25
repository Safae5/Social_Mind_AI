<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\VerifyEmailRequest;
use App\Http\Resources\UserResource;
use App\Models\UserSession;
use App\Services\Auth\AuthService;
use App\Services\Auth\EmailVerificationService;
use App\Services\Auth\JwtService;
use App\Services\Auth\PasswordResetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService              $authService,
        private readonly EmailVerificationService $emailVerificationService,
        private readonly PasswordResetService     $passwordResetService,
        private readonly JwtService               $jwtService
    ) {}

    // ── POST /api/auth/register ───────────────────────────────────
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->register($request->validated());

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'data'    => ['user' => new UserResource($result['user'])],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() ?: 500);
        }
    }

    // ── POST /api/auth/login ──────────────────────────────────────
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->login(
                $request->validated(),
                $request->ip(),
                $request->userAgent() ?? 'Unknown'
            );

            $result['user']->load('activeSubscription.plan');

            return response()->json([
                'success' => true,
                'message' => 'Connexion réussie.',
                'data'    => [
                    'user'          => new UserResource($result['user']),
                    'access_token'  => $result['access_token'],
                    'refresh_token' => $result['refresh_token'],
                    'token_type'    => $result['token_type'],
                    'expires_in'    => $result['expires_in'],
                    'expires_at'    => $result['expires_at'],
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() ?: 500);
        }
    }

    // ── POST /api/auth/logout ─────────────────────────────────────
    public function logout(Request $request): JsonResponse
    {
        try {
            $token = $request->bearerToken();
            $this->authService->logout($request->user(), $token);

            return response()->json([
                'success' => true,
                'message' => 'Déconnexion réussie.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // ── POST /api/auth/logout-all ─────────────────────────────────
    public function logoutAll(Request $request): JsonResponse
    {
        $this->authService->logoutAll($request->user());

        return response()->json([
            'success' => true,
            'message' => 'Déconnecté de tous les appareils.',
        ]);
    }

    // ── GET /api/auth/me ──────────────────────────────────────────
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('activeSubscription.plan');

        // Met à jour last_active de la session courante
        $user->sessions()
            ->where('is_current', true)
            ->update(['last_active_at' => now()]);

        return response()->json([
            'success' => true,
            'data'    => ['user' => new UserResource($user)],
        ]);
    }

    // ── PUT /api/auth/password ────────────────────────────────────
    // Changement de mot de passe par un utilisateur déjà connecté
    // (distinct du flux public forgot/reset-password).
    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mot de passe actuel incorrect.',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json([
            'success' => true,
            'message' => '✅ Mot de passe mis à jour.',
        ]);
    }

    // ── GET /api/auth/notifications ────────────────────────────────
    public function getNotifications(Request $request): JsonResponse
    {
        $prefs = $request->user()->preferences['notifications'] ?? [];

        return response()->json([
            'success' => true,
            'data'    => ['notifications' => array_merge([
                'email_agent_activity'  => true,
                'email_weekly_summary'  => true,
                'email_billing'         => true,
                'email_product_updates' => false,
            ], $prefs)],
        ]);
    }

    // ── PUT /api/auth/notifications ────────────────────────────────
    // Stocké dans users.preferences (JSON déjà existant) — pas de
    // nouvelle table/colonne nécessaire.
    public function updateNotifications(Request $request): JsonResponse
    {
        $request->validate([
            'email_agent_activity'  => 'sometimes|boolean',
            'email_weekly_summary'  => 'sometimes|boolean',
            'email_billing'         => 'sometimes|boolean',
            'email_product_updates' => 'sometimes|boolean',
        ]);

        $user  = $request->user();
        $prefs = $user->preferences ?? [];
        $prefs['notifications'] = array_merge($prefs['notifications'] ?? [], $request->all());
        $user->update(['preferences' => $prefs]);

        return response()->json([
            'success' => true,
            'message' => '✅ Préférences de notification mises à jour.',
            'data'    => ['notifications' => $prefs['notifications']],
        ]);
    }

    // ── POST /api/auth/refresh ────────────────────────────────────
    // Renouvelle l'access token via le refresh token (Sanctum)
    public function refresh(Request $request): JsonResponse
{
    try {
        $request->validate([
            'refresh_token' => 'required|string',
        ]);

        $refreshTokenValue = $request->refresh_token;
        [$id, $token]      = explode('|', $refreshTokenValue, 2);

        $sanctumToken = \Laravel\Sanctum\PersonalAccessToken::find($id);

        if (!$sanctumToken) {
            return response()->json([
                'success' => false,
                'message' => 'Refresh token invalide.',
                'code'    => 'INVALID_REFRESH_TOKEN',
            ], 401);
        }

        if (!hash_equals($sanctumToken->token, hash('sha256', $token))) {
            return response()->json([
                'success' => false,
                'message' => 'Refresh token invalide.',
                'code'    => 'INVALID_REFRESH_TOKEN',
            ], 401);
        }

        if ($sanctumToken->expires_at && $sanctumToken->expires_at->isPast()) {
            $sanctumToken->delete();
            return response()->json([
                'success' => false,
                'message' => 'Refresh token expiré. Reconnectez-vous.',
                'code'    => 'REFRESH_TOKEN_EXPIRED',
            ], 401);
        }

        $user = $sanctumToken->tokenable;

        // ── Génère un nouveau token ───────────────────────────
        $newTokens = $this->jwtService->generateTokenPair($user);

        // ── Met à jour token_id AVANT de supprimer l'ancien token ──
        $user->sessions()
            ->where('token_id', (string) $sanctumToken->id)
            ->update(['token_id' => (string) $newTokens['refresh_token_id']]);

        // ── Supprime l'ancien refresh token ───────────────────
        $sanctumToken->delete();

        // ── Met à jour la session ─────────────────────────────
        $user->sessions()
            ->where('is_current', true)
            ->update(['last_active_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Token renouvelé avec succès.',
            'data'    => $newTokens,
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
        ], 401);
    }
}

    // ── POST /api/auth/email/verify ───────────────────────────────
    public function verifyEmail(VerifyEmailRequest $request): JsonResponse
    {
        try {
            $user = $this->emailVerificationService->verify(
                $request->token,
                $request->email
            );

            return response()->json([
                'success' => true,
                'message' => 'E-mail vérifié avec succès.',
                'data'    => ['user' => new UserResource($user)],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() ?: 400);
        }
    }

    // ── POST /api/auth/email/resend ───────────────────────────────
    public function resendVerification(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        try {
            $this->emailVerificationService->resend($request->email);
            return response()->json([
                'success' => true,
                'message' => 'E-mail de vérification renvoyé.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() ?: 400);
        }
    }

    // ── POST /api/auth/forgot-password ───────────────────────────
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            $this->passwordResetService->sendResetLink($request->email);
            return response()->json([
                'success' => true,
                'message' => 'Lien de réinitialisation envoyé.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() ?: 400);
        }
    }

    // ── POST /api/auth/reset-password ────────────────────────────
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        try {
            $this->passwordResetService->reset(
                $request->token,
                $request->email,
                $request->password
            );
            return response()->json([
                'success' => true,
                'message' => 'Mot de passe réinitialisé avec succès.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() ?: 400);
        }
    }

    // ── GET /api/auth/sessions ────────────────────────────────────
    public function sessions(Request $request): JsonResponse
{
    $user = $request->user();

    $sessions = UserSession::where('user_id', $user->id)
        ->orderByDesc('last_active_at')
        ->get()
        ->map(function ($session) {
            return [
                'id'             => $session->id,
                'device_type'    => $session->device_type    ?? 'desktop',
                'device_name'    => $session->device_name    ?? 'Appareil inconnu',
                'browser'        => $session->browser        ?? 'Inconnu',
                'os'             => $session->os             ?? 'Inconnu',
                'ip_address'     => $session->ip_address     ?? null,
                'location'       => $session->location       ?? null,
                'is_current'     => (bool) $session->is_current,
                'last_active_at' => $session->last_active_at?->toIso8601String(),
                'expires_at'     => $session->expires_at?->toIso8601String(),
                'is_expired'     => $session->expires_at
                    ? $session->expires_at->isPast()
                    : false,
            ];
        });

    return response()->json([
        'success' => true,
        'data'    => [
            'sessions'     => $sessions,
            'total'        => $sessions->count(),
            'active_count' => $sessions->where('is_expired', false)->count(),
        ],
    ]);
}

    // ── DELETE /api/auth/sessions/{id} ────────────────────────────
    public function revokeSession(Request $request, int $sessionId): JsonResponse
    {
        $session = $request->user()
            ->sessions()
            ->findOrFail($sessionId);

        // Empêche de révoquer la session courante depuis elle-même
        if ($session->is_current) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisez /logout pour déconnecter la session courante.',
            ], 400);
        }

        // Révoque le token Sanctum (refresh) associé
        $request->user()
            ->tokens()
            ->where('id', $session->token_id)
            ->delete();

        $session->delete();

        return response()->json([
            'success' => true,
            'message' => 'Session révoquée avec succès.',
        ]);
    }

    // ── DELETE /api/auth/sessions ─────────────────────────────────
    // Révoque toutes les sessions sauf la courante
    public function revokeOtherSessions(Request $request): JsonResponse
    {
        $user = $request->user();

        // Supprime toutes les sessions sauf la courante
        $user->sessions()
            ->where('is_current', false)
            ->delete();

        // Révoque les refresh tokens sauf le courant
        $currentSession = $user->sessions()->where('is_current', true)->first();
        $user->tokens()
            ->where('name', 'like', 'refresh_token_%')
            ->when($currentSession, fn($q) =>
                $q->where('id', '!=', $currentSession->token_id)
            )
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Toutes les autres sessions ont été révoquées.',
        ]);
    }

    // ── GET /api/auth/token/info ──────────────────────────────────
    // Infos sur le token actuel
    public function tokenInfo(Request $request): JsonResponse
    {
        $token   = $request->bearerToken();
        $payload = $this->jwtService->getPayload($token);
        $ttl     = $this->jwtService->getExpirationTime($token);

        return response()->json([
            'success' => true,
            'data'    => [
                'token_id'        => $payload['jti'] ?? null,
                'expires_at'      => isset($payload['exp'])
                    ? now()->setTimestamp($payload['exp'])->toIso8601String()
                    : null,
                'seconds_remaining' => max(0, $ttl),
                'role'            => $payload['role'] ?? null,
                'current_plan'    => $payload['current_plan'] ?? null,
            ],
        ]);
    }
}
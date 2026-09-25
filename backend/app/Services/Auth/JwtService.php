<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Models\UserSession;
use Carbon\Carbon;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Tymon\JWTAuth\Facades\JWTAuth;

class JwtService
{
    // ── Génère access + refresh tokens ───────────────────────────
    public function generateTokenPair(User $user): array
{
    // ── Forcer int pour éviter l'erreur Carbon ────────────────
    $ttlMinutes = (int) config('jwt.ttl', 60);

    $accessToken = JWTAuth::fromUser($user);

    $expiration   = now()->addMinutes($ttlMinutes);
    $refreshTokenModel = $user->createToken(
        'refresh_token_' . now()->timestamp,
        ['refresh'],
        now()->addDays(14)
    );

    return [
        'access_token'     => $accessToken,
        'refresh_token'    => $refreshTokenModel->plainTextToken,
        'refresh_token_id' => $refreshTokenModel->accessToken->id,
        'token_type'       => 'Bearer',
        'expires_in'       => $ttlMinutes * 60,
        'expires_at'       => $expiration->toIso8601String(),
    ];
}

    // ── Vérifie et décode un token ────────────────────────────────
    public function validateToken(string $token): ?User
    {
        try {
            return JWTAuth::setToken($token)->authenticate();
        } catch (TokenExpiredException) {
            throw new \Exception('Token expiré.', 401);
        } catch (TokenInvalidException) {
            throw new \Exception('Token invalide.', 401);
        } catch (JWTException) {
            throw new \Exception('Token absent ou malformé.', 401);
        }
    }

    // ── Rafraîchit un access token ────────────────────────────────
    public function refreshAccessToken(string $oldToken): string
    {
        try {
            JWTAuth::setToken($oldToken);
            $newToken = JWTAuth::refresh();
            return $newToken;
        } catch (TokenExpiredException) {
            // Token trop vieux pour être rafraîchi
            throw new \Exception('Session expirée. Reconnectez-vous.', 401);
        } catch (JWTException) {
            throw new \Exception('Impossible de rafraîchir le token.', 401);
        }
    }

    // ── Invalide un token (blacklist) ─────────────────────────────
    public function invalidateToken(string $token): void
    {
        try {
            JWTAuth::setToken($token)->invalidate();
        } catch (JWTException) {
            // Ignore si déjà invalide
        }
    }

    // ── Extrait le payload d'un token ─────────────────────────────
    public function getPayload(string $token): array
    {
        try {
            $payload = JWTAuth::setToken($token)->getPayload();
            return [
                'sub'          => $payload->get('sub'),
                'role'         => $payload->get('role'),
                'email'        => $payload->get('email'),
                'current_plan' => $payload->get('current_plan'),
                'iat'          => $payload->get('iat'),
                'exp'          => $payload->get('exp'),
                'jti'          => $payload->get('jti'),
            ];
        } catch (JWTException) {
            return [];
        }
    }

    // ── Calcule le temps restant avant expiration ─────────────────
    public function getExpirationTime(string $token): int
    {
        try {
            $payload = JWTAuth::setToken($token)->getPayload();
            return $payload->get('exp') - now()->timestamp;
        } catch (JWTException) {
            return 0;
        }
    }
}
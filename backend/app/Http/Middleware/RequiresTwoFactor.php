<?php

namespace App\Http\Middleware;

use App\Services\Auth\TwoFactorService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequiresTwoFactor
{
    public function __construct(
        private readonly TwoFactorService $twoFactorService
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }

        // Si l'utilisateur n'est pas admin → pas besoin de 2FA
        if (!$user->isAdmin()) {
            return $next($request);
        }

        // Admin sans 2FA activée → configuration obligatoire, accès bloqué
        if (!$user->hasTwoFactorEnabled()) {
            return response()->json([
                'success' => false,
                'message' => 'La 2FA est obligatoire pour les administrateurs. Veuillez la configurer.',
                'code'    => 'TWO_FACTOR_SETUP_REQUIRED',
                'data'    => [
                    'requires_2fa_setup' => true,
                ],
            ], 403);
        }

        // Récupère le token de session 2FA depuis le header
        $twoFactorToken = $request->header('X-2FA-Token')
            ?? $request->get('two_factor_session_token');

        if (!$twoFactorToken) {
            return response()->json([
                'success' => false,
                'message' => 'Vérification 2FA requise.',
                'code'    => 'TWO_FACTOR_REQUIRED',
                'data'    => [
                    'requires_2fa' => true,
                ],
            ], 403);
        }

        // Vérifie la session 2FA
        if (!$this->twoFactorService->validateTwoFactorSession($user, $twoFactorToken)) {
            return response()->json([
                'success' => false,
                'message' => 'Session 2FA expirée. Veuillez re-vérifier votre identité.',
                'code'    => 'TWO_FACTOR_SESSION_EXPIRED',
                'data'    => [
                    'requires_2fa' => true,
                ],
            ], 403);
        }

        return $next($request);
    }
}
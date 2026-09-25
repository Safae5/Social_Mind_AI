<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\TwoFactorAuthLog;
use App\Services\Auth\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TwoFactorController extends Controller
{
    public function __construct(
        private readonly TwoFactorService $twoFactorService
    ) {}

    // ══════════════════════════════════════════════════════════════
    // SETUP 2FA
    // ══════════════════════════════════════════════════════════════

    // ── GET /api/2fa/setup ────────────────────────────────────────
    // Génère le QR Code et le secret pour l'admin
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();

        // Seulement pour les admins
        if (!$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'La 2FA est réservée aux administrateurs.',
            ], 403);
        }

        // Si déjà activée
        if ($user->hasTwoFactorEnabled()) {
            return response()->json([
                'success' => false,
                'message' => 'La 2FA est déjà activée sur votre compte.',
                'data'    => [
                    'two_factor_enabled'    => true,
                    'recovery_codes_count'  => $this->twoFactorService->remainingRecoveryCodes($user),
                ],
            ], 400);
        }

        $setup = $this->twoFactorService->prepareTwoFactor($user);

        return response()->json([
            'success' => true,
            'message' => 'Scannez le QR Code avec Google Authenticator.',
            'data'    => $setup,
        ]);
    }

    // ── POST /api/2fa/confirm ─────────────────────────────────────
    // Confirme la 2FA avec le premier code OTP
    public function confirm(Request $request): JsonResponse
    {
        $request->validate([
            'otp' => ['required', 'string', 'digits:6'],
        ]);

        $user  = $request->user();
        $valid = $this->twoFactorService->confirmTwoFactor($user, $request->otp);

        if (!$valid) {
            // Log la tentative échouée
            TwoFactorAuthLog::create([
                'user_id'    => $user->id,
                'type'       => 'totp',
                'success'    => false,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Code OTP invalide. Vérifiez votre application d\'authentification.',
            ], 400);
        }

        // Log le succès
        TwoFactorAuthLog::create([
            'user_id'    => $user->id,
            'type'       => 'totp',
            'success'    => true,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        // Recharge l'utilisateur
        $user->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Authentification à deux facteurs activée avec succès.',
            'data'    => [
                'user'           => new UserResource($user),
                'recovery_codes' => $user->two_factor_recovery_codes,
            ],
        ]);
    }

    // ── DELETE /api/2fa/disable ───────────────────────────────────
    // Désactive la 2FA
    public function disable(Request $request): JsonResponse
    {
        $request->validate([
            'otp' => ['required', 'string', 'digits:6'],
        ]);

        $user    = $request->user();
        $disabled = $this->twoFactorService->disableTwoFactor($user, $request->otp);

        if (!$disabled) {
            return response()->json([
                'success' => false,
                'message' => 'Code OTP invalide. Impossible de désactiver la 2FA.',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Authentification à deux facteurs désactivée.',
            'data'    => ['user' => new UserResource($user->refresh())],
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    // VÉRIFICATION 2FA (après login)
    // ══════════════════════════════════════════════════════════════

    // ── POST /api/2fa/verify ──────────────────────────────────────
    // Vérifie le code OTP après le login
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'otp'            => ['required_without:recovery_code', 'nullable', 'string', 'digits:6'],
            'recovery_code'  => ['required_without:otp', 'nullable', 'string'],
        ]);

        $user  = $request->user();
        $valid = false;
        $type  = 'totp';

        if ($request->filled('recovery_code')) {
            // Vérifie avec un code de récupération
            $valid = $this->twoFactorService->verifyRecoveryCode($user, $request->recovery_code);
            $type  = 'recovery_code';
        } else {
            // Vérifie avec l'OTP
            $valid = $this->twoFactorService->verifyOtp($user, $request->otp);
        }

        // Log la tentative
        TwoFactorAuthLog::create([
            'user_id'    => $user->id,
            'type'       => $type,
            'success'    => $valid,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        if (!$valid) {
            return response()->json([
                'success' => false,
                'message' => $type === 'recovery_code'
                    ? 'Code de récupération invalide.'
                    : 'Code OTP invalide ou expiré.',
                'code'    => 'INVALID_2FA_CODE',
            ], 400);
        }

        // Crée une session 2FA (valide 8h)
        $sessionToken = $this->twoFactorService->createTwoFactorSession(
            $user,
            $request->ip(),
            $request->userAgent() ?? 'Unknown'
        );

        return response()->json([
            'success' => true,
            'message' => 'Identité vérifiée avec succès.',
            'data'    => [
                'two_factor_session_token' => $sessionToken,
                'user'                    => new UserResource($user),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    // CODES DE RÉCUPÉRATION
    // ══════════════════════════════════════════════════════════════

    // ── GET /api/2fa/recovery-codes ───────────────────────────────
    public function recoveryCodes(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasTwoFactorEnabled()) {
            return response()->json([
                'success' => false,
                'message' => 'La 2FA n\'est pas activée.',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'recovery_codes' => $user->two_factor_recovery_codes ?? [],
                'count'          => $this->twoFactorService->remainingRecoveryCodes($user),
            ],
        ]);
    }

    // ── POST /api/2fa/recovery-codes/regenerate ───────────────────
    // Régénère de nouveaux codes (invalide les anciens)
    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $request->validate([
            'otp' => ['required', 'string', 'digits:6'],
        ]);

        try {
            $newCodes = $this->twoFactorService->regenerateRecoveryCodes(
                $request->user(),
                $request->otp
            );

            return response()->json([
                'success' => true,
                'message' => 'Codes de récupération régénérés. Sauvegardez-les maintenant.',
                'data'    => ['recovery_codes' => $newCodes],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() ?: 400);
        }
    }

    // ── GET /api/2fa/status ───────────────────────────────────────
    // Statut 2FA de l'utilisateur courant
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data'    => [
                'two_factor_enabled'    => $user->hasTwoFactorEnabled(),
                'confirmed_at'          => $user->two_factor_confirmed_at?->toIso8601String(),
                'recovery_codes_count'  => $this->twoFactorService->remainingRecoveryCodes($user),
                'requires_2fa'          => $user->requiresTwoFactor(),
            ],
        ]);
    }
}
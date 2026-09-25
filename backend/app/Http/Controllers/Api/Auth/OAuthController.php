<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\Auth\OAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\AbstractProvider;
use Throwable;

class OAuthController extends Controller
{
    public function __construct(
        private readonly OAuthService $oAuthService
    ) {}

    // ── GET /api/auth/google ──────────────────────────────────
    public function redirectToGoogle(): RedirectResponse
    {
        /** @var AbstractProvider $driver */
        $driver = Socialite::driver('google');

        return $driver
            ->stateless()
            ->scopes(['openid', 'profile', 'email'])
            ->redirect();
    }

    // ── GET /api/auth/google/callback ─────────────────────────
    public function handleGoogleCallback(Request $request): RedirectResponse
    {
        return $this->handleCallback($request, 'google');
    }

    // ── GET /api/auth/facebook ────────────────────────────────
    public function redirectToFacebook(): RedirectResponse
    {
        /** @var AbstractProvider $driver */
        $driver = Socialite::driver('facebook');

        return $driver
            ->stateless()
            ->scopes(['email', 'public_profile'])
            ->redirect();
    }

    // ── GET /api/auth/facebook/callback ───────────────────────
    public function handleFacebookCallback(Request $request): RedirectResponse
    {
        return $this->handleCallback($request, 'facebook');
    }

    // ── Handler commun ────────────────────────────────────────
    private function handleCallback(Request $request, string $provider): RedirectResponse
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        if ($request->has('error')) {
            return redirect(
                $frontendUrl . '/auth/callback?error=' . urlencode($request->get('error'))
            );
        }

        try {
            /** @var AbstractProvider $driver */
            $driver = Socialite::driver($provider);

            $socialiteUser = $driver->stateless()->user();

            if (!$socialiteUser->getEmail()) {
                return redirect($frontendUrl . '/auth/callback?error=no_email');
            }

            $user = $this->oAuthService->findOrCreateUser($socialiteUser, $provider);

            if (in_array($user->status, ['suspended', 'banned'])) {
                return redirect($frontendUrl . '/auth/callback?error=account_suspended');
            }

            $tokens = $this->oAuthService->generateTokens(
                $user,
                $request->ip(),
                $request->userAgent() ?? 'Unknown'
            );

            $redirectUrl = $frontendUrl . '/auth/callback'
                . '?token='         . urlencode($tokens['access_token'])
                . '&refresh_token=' . urlencode($tokens['refresh_token'])
                . '&provider='      . $provider;

            return redirect($redirectUrl);

        } catch (Throwable $e) {
            report($e);
            return redirect($frontendUrl . '/auth/callback?error=oauth_failed');
        }
    }

    // ── Comptes sociaux liés ──────────────────────────────────
    public function linkedAccounts(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $accounts = SocialAccount::where('user_id', $user->id)
            ->whereIn('provider', ['google', 'facebook'])
            ->whereNull('platform')
            ->select(['id', 'provider', 'name', 'email', 'avatar', 'created_at'])
            ->get();

        return response()->json([
            'success' => true,
            'data'    => ['accounts' => $accounts],
        ]);
    }

    // ── Lier un compte ────────────────────────────────────────
    public function linkAccount(Request $request, string $provider): JsonResponse
    {
        if (!in_array($provider, ['google', 'facebook'])) {
            return response()->json([
                'success' => false,
                'message' => 'Provider non supporté.',
            ], 400);
        }

        try {
            $request->validate(['token' => 'required|string']);

            /** @var AbstractProvider $driver */
            $driver = Socialite::driver($provider);

            $socialiteUser = $driver->stateless()->userFromToken($request->token);

            /** @var User $user */
            $user = $request->user();

            $existing = SocialAccount::where('provider', $provider)
                ->where('provider_id', $socialiteUser->getId())
                ->where('user_id', '!=', $user->id)
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce compte est déjà lié à un autre utilisateur.',
                ], 409);
            }

            $this->oAuthService->linkSocialAccount($user, $socialiteUser, $provider);

            /** @var User $freshUser */
            $freshUser = User::find($user->id);

            return response()->json([
                'success' => true,
                'message' => 'Compte ' . ucfirst($provider) . ' lié avec succès.',
                'data'    => ['user' => new UserResource($freshUser)],
            ]);

        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de lier le compte : ' . $e->getMessage(),
            ], 500);
        }
    }

    // ── Délier un compte ──────────────────────────────────────
    public function unlinkAccount(Request $request, string $provider): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $deleted = SocialAccount::where('user_id', $user->id)
            ->where('provider', $provider)
            ->delete();

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun compte ' . ucfirst($provider) . ' trouvé.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Compte ' . ucfirst($provider) . ' délié.',
        ]);
    }
}
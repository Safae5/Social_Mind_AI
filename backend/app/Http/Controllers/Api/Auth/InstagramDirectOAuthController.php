<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\Social\InstagramDirectOAuthService;
use App\Events\SocialAccountConnected;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * "Connecter Instagram directement" — Instagram API with Instagram Login,
 * sans Page Facebook liée. Flux parallèle à MetaOAuthController, pas un
 * remplacement : les deux coexistent, voir SocialAccount::isInstagramDirectLogin().
 */
class InstagramDirectOAuthController extends Controller
{
    public function __construct(
        private readonly InstagramDirectOAuthService $instagramService,
    ) {}

    // ── GET /api/oauth/instagram-direct/redirect ──────────────
    public function redirect(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->socialAccounts()->active()->count() >= 2) {
            return response()->json([
                'success' => false,
                'message' => 'Maximum 2 comptes connectés. Déconnectez un compte pour en ajouter un autre.',
                'code'    => 'MAX_ACCOUNTS_REACHED',
            ], 400);
        }

        $state    = Str::random(40);
        $authUrl  = $this->instagramService->buildAuthUrl($state);

        $returnTo = $user->role === 'business' ? '/dashboard/professional' : '/dashboard/settings';

        // Même raison que MetaOAuthController::redirect() : Cache plutôt que
        // session, le frontend appelle cet endpoint en JSON/axios sans
        // credentials (JWT, pas cookies).
        Cache::put("instagram_direct_oauth:{$state}", [
            'user_id'   => $user->id,
            'return_to' => $returnTo,
        ], now()->addMinutes(10));

        return response()->json([
            'success'  => true,
            'auth_url' => $authUrl,
            'state'    => $state,
        ]);
    }

    // ── GET /api/instagram/callback (web.php) ─────────────────
    public function callback(Request $request)
    {
        $code  = $request->get('code');
        $state = $request->get('state');
        $error = $request->get('error');

        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        $oauthData = $state ? Cache::pull("instagram_direct_oauth:{$state}") : null;
        $returnTo  = $oauthData['return_to'] ?? '/dashboard/settings';

        if ($error) {
            return redirect("{$frontendUrl}{$returnTo}?oauth_error=" . urlencode($error));
        }

        if (!$oauthData) {
            return redirect("{$frontendUrl}{$returnTo}?oauth_error=invalid_state");
        }

        $userId = $oauthData['user_id'];
        if (!$userId) {
            return redirect("{$frontendUrl}{$returnTo}?oauth_error=session_expired");
        }

        try {
            $tokenData = $this->instagramService->exchangeCodeForToken($code);
            $profile   = $this->instagramService->getProfile($tokenData['access_token']);

            $user    = User::findOrFail($userId);
            $account = $this->instagramService->saveAccount($user, $profile, $tokenData);

            event(new SocialAccountConnected($user, $account));

            return redirect("{$frontendUrl}{$returnTo}?oauth_success=instagram_direct&accounts=1");

        } catch (\Exception $e) {
            Log::error('Instagram Direct OAuth callback error', ['error' => $e->getMessage()]);
            return redirect("{$frontendUrl}{$returnTo}?oauth_error=" . urlencode($e->getMessage()));
        }
    }

    // ── DELETE /api/oauth/instagram-direct/disconnect/{id} ────
    public function disconnect(Request $request, int $accountId): JsonResponse
    {
        $account = SocialAccount::where('user_id', $request->user()->id)
            ->where('platform', 'instagram')
            ->where('provider', 'platform_instagram_direct')
            ->findOrFail($accountId);

        $account->delete();

        return response()->json([
            'success' => true,
            'message' => 'Compte Instagram déconnecté.',
        ]);
    }
}

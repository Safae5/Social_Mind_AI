<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Events\SocialAccountConnected;
use App\Services\Social\TikTokOAuthService;
use App\Services\Scheduler\SchedulerService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class TikTokOAuthController extends Controller
{
    public function __construct(
        private readonly TikTokOAuthService $tiktokService,
        private readonly SchedulerService   $schedulerService,
    ) {}

    // ── GET /api/oauth/tiktok/redirect ────────────────────────
    public function redirect(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->socialAccounts()->active()->count() >= 2) {
            return response()->json([
                'success' => false,
                'message' => 'Maximum 2 comptes connectés.',
                'code'    => 'MAX_ACCOUNTS_REACHED',
            ], 400);
        }

        $state = Str::random(40);
        $built = $this->tiktokService->buildAuthUrl($state);

        // Cache, pas session — voir le commentaire de
        // MetaOAuthController::redirect() : withCredentials=false côté
        // axios fait qu'un Set-Cookie de session ici n'atteint jamais le
        // navigateur. $state (transmis par TikTok dans l'URL de retour,
        // pas par cookie) sert de clé — auto-expire en 10 min.
        Cache::put("tiktok_oauth:{$state}", [
            'user_id'       => $user->id,
            'code_verifier' => $built['code_verifier'],
        ], now()->addMinutes(10));

        return response()->json([
            'success'  => true,
            'auth_url' => $built['auth_url'],
            'state'    => $state,
        ]);
    }

    // ── GET /oauth/tiktok/callback (web.php) ──────────────────
    public function callback(Request $request)
    {
        $code         = $request->get('code');
        $state        = $request->get('state');
        $error        = $request->get('error');
        $frontendUrl  = config('app.frontend_url', 'http://localhost:5173');

        if ($error) {
            return redirect("{$frontendUrl}/dashboard/settings?oauth_error=" . urlencode($error));
        }

        $oauthData = $state ? Cache::pull("tiktok_oauth:{$state}") : null;
        if (!$oauthData) {
            return redirect("{$frontendUrl}/dashboard/settings?oauth_error=invalid_state");
        }

        $userId       = $oauthData['user_id'];
        $codeVerifier = $oauthData['code_verifier'];

        try {
            $tokenData = $this->tiktokService->exchangeCodeForToken($code, $codeVerifier);
            $userInfo  = $this->tiktokService->getUserInfo($tokenData['access_token']);
            $user      = \App\Models\User::findOrFail($userId);
            $account   = $this->tiktokService->saveTikTokAccount($user, $tokenData, $userInfo);

            event(new SocialAccountConnected($user, $account));
            $this->schedulerService->triggerAnalysis($account, true);

            return redirect("{$frontendUrl}/dashboard/settings?oauth_success=tiktok");

        } catch (\Exception $e) {
            Log::error('TikTok OAuth callback error', ['error' => $e->getMessage()]);
            return redirect("{$frontendUrl}/dashboard/settings?oauth_error=" . urlencode($e->getMessage()));
        }
    }

    // ── DELETE /api/oauth/tiktok/disconnect ───────────────────
    public function disconnect(Request $request, int $accountId): JsonResponse
    {
        $account = \App\Models\SocialAccount::where('user_id', $request->user()->id)
            ->where('platform', 'tiktok')
            ->findOrFail($accountId);

        $account->delete();

        return response()->json([
            'success' => true,
            'message' => 'Compte TikTok déconnecté.',
        ]);
    }
}
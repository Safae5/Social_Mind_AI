<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use App\Services\Social\MetaOAuthService;
use App\Services\Scheduler\SchedulerService;
use App\Events\SocialAccountConnected;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MetaOAuthController extends Controller
{
    public function __construct(
        private readonly MetaOAuthService  $metaService,
        private readonly SchedulerService  $schedulerService,
    ) {}

    // ── GET /api/oauth/meta/redirect ──────────────────────────
    public function redirect(Request $request): JsonResponse
    {
        $user = $request->user();

        // Vérifie la limite de 2 comptes
        if ($user->socialAccounts()->active()->count() >= 2) {
            return response()->json([
                'success' => false,
                'message' => 'Maximum 2 comptes connectés. Déconnectez un compte pour en ajouter un autre.',
                'code'    => 'MAX_ACCOUNTS_REACHED',
            ], 400);
        }

        $state    = Str::random(40);
        $authUrl  = $this->metaService->buildAuthUrl($state);

        // Le callback ne connaît pas le contexte d'origine (standard vs
        // professionnel) — on le mémorise ici pour rediriger au bon
        // endroit après le retour de Meta. Défaut inchangé pour le
        // Planificateur standard, qui utilisait déjà /dashboard/settings.
        $returnTo = $user->role === 'business' ? '/dashboard/professional' : '/dashboard/settings';

        // Cache, pas session : cet endpoint est appelé en JSON/axios avec
        // withCredentials=false (JWT, pas cookies — voir axios.js). Le
        // navigateur ignore silencieusement le Set-Cookie d'une réponse
        // cross-origin (5173 → 8000) sans credentials, donc la session
        // écrite ici n'existait jamais côté navigateur : au retour de Meta
        // (vraie navigation top-level vers /api/meta/callback), le callback
        // lisait une session vierge et échouait toujours avec
        // oauth_error=invalid_state. `state` (transmis par Meta dans l'URL
        // de retour, pas par cookie) sert de clé — auto-expire en 10 min.
        Cache::put("meta_oauth:{$state}", [
            'user_id'   => $user->id,
            'return_to' => $returnTo,
        ], now()->addMinutes(10));

        return response()->json([
            'success'  => true,
            'auth_url' => $authUrl,
            'state'    => $state,
        ]);
    }

    // ── GET /oauth/meta/callback (web.php) ────────────────────
    public function callback(Request $request)
    {
        $code  = $request->get('code');
        $state = $request->get('state');
        $error = $request->get('error');

        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        // Récupère l'état mémorisé via `state` (voir redirect() ci-dessus) —
        // pull() le lit et l'efface aussitôt : usage unique, pas de replay.
        $oauthData = $state ? Cache::pull("meta_oauth:{$state}") : null;
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
            // Échange code → Long-Lived Token
            $tokenData = $this->metaService->exchangeCodeForToken($code);
            $accessToken = $tokenData['access_token'];

            // Récupère les Pages Facebook et comptes Instagram
            $pages = $this->metaService->getFacebookPages($accessToken);

            if (empty($pages)) {
                return redirect("{$frontendUrl}{$returnTo}?oauth_error=no_pages_found");
            }

            // Traite la première page avec un compte Instagram Business
            $user = \App\Models\User::findOrFail($userId);
            $savedAccounts = [];

            foreach ($pages as $page) {
                $igData = $page['instagram_business_account'] ?? null;

                if ($igData) {
                    // Instagram Business Account
                    $igProfile = $this->metaService->getInstagramProfile(
                        $igData['id'],
                        $page['access_token']
                    );
                    $account = $this->metaService->saveInstagramAccount($user, $page, $igProfile, $tokenData);
                    $savedAccounts[] = $account;
                    event(new SocialAccountConnected($user, $account));

                    // Lance l'analyse IA en background
                    $this->schedulerService->triggerAnalysis($account, true);
                }

                // Facebook Page
                $fbAccount = $this->metaService->saveFacebookAccount($user, $page, $tokenData);
                $savedAccounts[] = $fbAccount;
                event(new SocialAccountConnected($user, $fbAccount));
            }

            return redirect("{$frontendUrl}{$returnTo}?oauth_success=meta&accounts=" . count($savedAccounts));

        } catch (\Exception $e) {
            Log::error('Meta OAuth callback error', ['error' => $e->getMessage()]);
            return redirect("{$frontendUrl}{$returnTo}?oauth_error=" . urlencode($e->getMessage()));
        }
    }

    // ── DELETE /api/oauth/meta/disconnect ─────────────────────
    public function disconnect(Request $request, int $accountId): JsonResponse
    {
        $account = SocialAccount::where('user_id', $request->user()->id)
            ->whereIn('platform', ['instagram', 'facebook'])
            ->findOrFail($accountId);

        $account->delete();

        return response()->json([
            'success' => true,
            'message' => "Compte {$account->platform} déconnecté.",
        ]);
    }
}
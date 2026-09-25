<?php

namespace App\Http\Middleware;

use App\Models\TwoFactorSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Exige une vérification 2FA récente (par défaut 15 min) pour les actions
 * admin les plus sensibles : suppression permanente, bannissement, remboursement,
 * rotation de clé API, activation du mode maintenance, changement de plan/feature flag.
 *
 * S'applique APRÈS le middleware 'admin.2fa' standard — celui-ci garantit déjà
 * une session 2FA valide (8h) ; celui-ci resserre l'exigence pour un sous-ensemble
 * de routes qui veulent une preuve d'identité plus fraîche que 8h.
 */
class RequiresRecentTwoFactor
{
    public function handle(Request $request, Closure $next, int $maxMinutes = 15): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }

        $token = $request->header('X-2FA-Token') ?? $request->get('two_factor_session_token');

        $session = $token
            ? TwoFactorSession::where('user_id', $user->id)
                ->where('session_token', $token)
                ->first()
            : null;

        if (!$session || !$session->isValid() || $session->verified_at->diffInMinutes(now()) > $maxMinutes) {
            return response()->json([
                'success' => false,
                'message' => "Cette action nécessite une vérification 2FA récente (moins de {$maxMinutes} min).",
                'code'    => 'RECENT_TWO_FACTOR_REQUIRED',
            ], 403);
        }

        return $next($request);
    }
}

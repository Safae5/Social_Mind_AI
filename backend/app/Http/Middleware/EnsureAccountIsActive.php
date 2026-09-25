<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * AuthService::login() bloque déjà les comptes suspended/banned À LA CONNEXION.
 * Mais un JWT déjà émis (TTL 60 min par défaut) continue de fonctionner sur
 * toutes les routes protégées tant qu'il n'expire pas — rien ne revérifiait
 * le statut à chaque requête. Ce middleware ferme cet écart : suspension/ban
 * coupe l'accès immédiatement, pas seulement à la prochaine connexion.
 */
class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && in_array($user->status, ['suspended', 'banned'])) {
            return response()->json([
                'success' => false,
                'message' => $user->status === 'banned'
                    ? 'Ce compte a été banni.'
                    : 'Ce compte a été suspendu.',
                'code' => 'ACCOUNT_' . strtoupper($user->status),
            ], 403);
        }

        return $next($request);
    }
}

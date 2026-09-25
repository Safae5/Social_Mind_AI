<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Facades\JWTAuth;

class JwtMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            // Récupère et vérifie le token JWT
            $user = JWTAuth::parseToken()->authenticate();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur introuvable.',
                    'code'    => 'USER_NOT_FOUND',
                ], 401);
            }

            // Injecte l'utilisateur dans la requête
            $request->setUserResolver(fn() => $user);

        } catch (TokenExpiredException) {
            return response()->json([
                'success' => false,
                'message' => 'Token expiré.',
                'code'    => 'TOKEN_EXPIRED',
            ], 401);

        } catch (JWTException) {
            return response()->json([
                'success' => false,
                'message' => 'Token invalide ou absent.',
                'code'    => 'TOKEN_INVALID',
            ], 401);
        }

        return $next($request);
    }
}
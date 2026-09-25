<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()?->isEmailVerified()) {
            return response()->json([
                'success' => false,
                'message' => 'Votre adresse e-mail n\'est pas vérifiée.',
                'code'    => 'EMAIL_NOT_VERIFIED',
            ], 403);
        }

        return $next($request);
    }
}
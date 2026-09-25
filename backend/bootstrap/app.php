<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web:      __DIR__ . '/../routes/web.php',
        api:      __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health:   '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        // ── Désactive CSRF pour toutes les routes API ─────────────
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'sanctum/csrf-cookie',
        ]);

        // ── CORS ──────────────────────────────────────────────────
        $middleware->use([
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        // ── API pure : jamais de redirection vers une route 'login' ──
        // Sans ça, Authenticate::redirectTo() plante (route 'login' inexistante)
        // quand un client n'envoie pas Accept: application/json — le
        // AuthenticationException handler ci-dessous ne s'exécute jamais.
        $middleware->redirectGuestsTo(fn () => null);

        // ── Alias middlewares ─────────────────────────────────────
        $middleware->alias([
            'jwt'          => \App\Http\Middleware\JwtMiddleware::class,
            'role'         => \App\Http\Middleware\RoleMiddleware::class,
            'subscription' => \App\Http\Middleware\SubscriptionMiddleware::class,
            'verified'     => \App\Http\Middleware\EnsureEmailIsVerified::class,
            '2fa'          => \App\Http\Middleware\RequiresTwoFactor::class,
            '2fa.recent'   => \App\Http\Middleware\RequiresRecentTwoFactor::class,
            'account.active' => \App\Http\Middleware\EnsureAccountIsActive::class,
            'agent'        => \App\Http\Middleware\EnforceAgentAvailability::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {

        $exceptions->render(function (
            \Illuminate\Auth\AuthenticationException $e,
            $request
        ) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non authentifié.',
                    'code'    => 'UNAUTHENTICATED',
                ], 401);
            }
        });

        $exceptions->render(function (
            \Illuminate\Validation\ValidationException $e,
            $request
        ) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides.',
                    'errors'  => $e->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (
            \Illuminate\Database\Eloquent\ModelNotFoundException $e,
            $request
        ) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ressource introuvable.',
                ], 404);
            }
        });

        $exceptions->render(function (
            \Illuminate\Session\TokenMismatchException $e,
            $request
        ) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session expirée. Veuillez réessayer.',
                    'code'    => 'CSRF_MISMATCH',
                ], 419);
            }
        });
    })
    ->create();
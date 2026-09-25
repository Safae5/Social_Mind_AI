<?php

namespace App\Providers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Http::globalRequestMiddleware(function ($request) {
            $aiEngineUrl = rtrim((string) config('services.ai_engine.url'), '/');
            if ($aiEngineUrl && str_starts_with((string) $request->getUri(), $aiEngineUrl)) {
                return $request->withHeader('X-Internal-Secret', config('services.ai_engine.secret'));
            }
            return $request;
        });

        // RecordAdminAuditLog est enregistré automatiquement par la découverte
        // d'événements de Laravel (app/Listeners, type-hint AdminActionPerformed
        // sur handle()) — ne pas l'enregistrer aussi ici avec Event::listen(),
        // ça double chaque écriture d'audit log (vérifié : les deux formes de
        // registration coexistent et s'exécutent chacune).
    }
}

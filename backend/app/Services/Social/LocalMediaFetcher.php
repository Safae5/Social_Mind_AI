<?php

namespace App\Services\Social;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Récupère les bytes d'une image, en évitant l'auto-appel HTTP.
 *
 * Si $url pointe vers notre propre disque 'public' (cas normal : toutes les
 * images générées y sont stockées), on lit le fichier directement sur disque
 * — jamais de requête HTTP vers soi-même. C'est nécessaire, pas juste plus
 * rapide : le serveur de dev intégré de PHP (`artisan serve`) est mono-
 * thread — une requête HTTP qui essaie de se rappeler elle-même pendant
 * qu'elle est encore en train de s'exécuter se bloque elle-même jusqu'au
 * timeout (observé : cURL 28, 30s). Pour une URL réellement externe (pas sur
 * ce disque), on retombe sur un vrai fetch HTTP, qui lui ne pose pas ce
 * problème.
 *
 * Extrait de MetaOAuthService (rule 6 : éviter une 2e copie de cette même
 * logique dans ContentCreatorPublishController, qui a le même besoin pour
 * publier un pack via Meta Graph API).
 */
class LocalMediaFetcher
{
    public static function bytes(string $url): string
    {
        $publicBase = rtrim(Storage::disk('public')->url(''), '/');

        if (Str::startsWith($url, $publicBase)) {
            $relativePath = ltrim(Str::after($url, $publicBase), '/');
            if (Storage::disk('public')->exists($relativePath)) {
                return Storage::disk('public')->get($relativePath);
            }
        }

        return Http::get($url)->body();
    }
}

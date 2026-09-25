<?php

return [

    // ── Clé secrète (générée par jwt:secret) ──────────────────
    'secret' => env('JWT_SECRET'),

    // ── Clés asymétriques (non utilisées ici) ─────────────────
    'keys' => [
        'public'  => env('JWT_PUBLIC_KEY'),
        'private' => env('JWT_PRIVATE_KEY'),
        'passphrase' => env('JWT_PASSPHRASE'),
    ],

    // ── Durée de vie du token en minutes ──────────────────────
    // 60 = 1 heure | 1440 = 1 jour | 10080 = 7 jours
    'ttl'         => (int) env('JWT_TTL', 60),

    // ── Durée de vie du refresh token en minutes ──────────────
    // 20160 = 14 jours | 43200 = 30 jours
    'refresh_ttl' => (int) env('JWT_REFRESH_TTL', 20160),

    // ── Algorithme de signature ───────────────────────────────
    'algo' => env('JWT_ALGO', Tymon\JWTAuth\Providers\JWT\Lcobucci::class),

    // ── Champs requis dans le token ───────────────────────────
    'required_claims' => [
        'iss', 'iat', 'exp', 'nbf', 'sub', 'jti',
    ],

    // ── Champs persistants (ne changent pas au refresh) ───────
    'persistent_claims' => [
        'role',
    ],

    // ── Verrouillage du sujet ─────────────────────────────────
    'lock_subject' => true,

    // ── Tolérance d'horloge en secondes ───────────────────────
    'leeway'      => (int) env('JWT_LEEWAY', 0),

    // ── Blacklist (invalide les tokens à la déconnexion) ──────
    'blacklist_enabled' => env('JWT_BLACKLIST_ENABLED', true),

    // ── Délai de grâce pour la blacklist ──────────────────────
    'blacklist_grace_period' => env('JWT_BLACKLIST_GRACE_PERIOD', 0),

    // ── Expiration en cas de déconnexion forcée ───────────────
    'show_black_list_exception' => env('JWT_SHOW_BLACKLIST_EXCEPTION', 1),

    // ── Provider de cache pour la blacklist ───────────────────
    'providers' => [
        'jwt'   => Tymon\JWTAuth\Providers\JWT\Lcobucci::class,
        'auth'  => Tymon\JWTAuth\Providers\Auth\Illuminate::class,
        'storage' => Tymon\JWTAuth\Providers\Storage\Illuminate::class,
    ],

];
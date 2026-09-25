<?php

return [

    // ── Activation ────────────────────────────────────────────────
    'enabled' => env('GOOGLE2FA_ENABLED', true),

    // ── Fenêtre de tolérance (codes valides avant/après) ─────────
    // 1 = accepte le code actuel + 1 code avant + 1 code après
    // Utile si l'horloge du téléphone est légèrement décalée
    'window' => 1,

    // ── Longueur du secret ────────────────────────────────────────
    'secret_length' => 32,

    // ── Algorithme ────────────────────────────────────────────────
    'algorithm' => 'sha1',

    // ── Nombre de codes de récupération ──────────────────────────
    'recovery_codes_count' => 8,

    // ── Durée de validité de la session 2FA (en minutes) ─────────
    'lifetime' => env('GOOGLE2FA_LIFETIME', 0), // 0 = dure toute la session

    // ── Nom de l'application dans Google Authenticator ───────────
    'issuer' => env('APP_NAME', 'Social Mind AI'),

];
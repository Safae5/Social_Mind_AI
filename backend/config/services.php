<?php

return [

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel'              => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // ── OAuth Google ──────────────────────────────────────────
    'google' => [
        'client_id'     => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect'      => env('GOOGLE_REDIRECT_URI'),
    ],

    // ── OAuth Facebook ────────────────────────────────────────
    'facebook' => [
        'client_id'     => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect'      => env('FACEBOOK_REDIRECT_URI'),
    ],

    'stripe' => [
    'key'             => env('STRIPE_KEY'),
    'secret'          => env('STRIPE_SECRET'),
    'webhook_secret'  => env('STRIPE_WEBHOOK_SECRET'),
],

    'meta' => [
       'app_id' => env('META_APP_ID'),
       'app_secret' => env('META_APP_SECRET'),
       'graph_version' => env('META_GRAPH_VERSION', 'v21.0'),
       'redirect_uri' => env('META_REDIRECT_URI'),
],

    // Instagram API with Instagram Login — credentials séparés de 'meta'
    // ci-dessus, produit Meta distinct (pas de Page Facebook requise).
    'instagram_direct' => [
        'app_id'        => env('INSTAGRAM_APP_ID'),
        'app_secret'    => env('INSTAGRAM_APP_SECRET'),
        'graph_version' => env('INSTAGRAM_GRAPH_VERSION', 'v21.0'),
        'redirect_uri'  => env('INSTAGRAM_REDIRECT_URI'),
    ],

    'tiktok' => [
        'client_key'    => env('TIKTOK_CLIENT_KEY'),
        'client_secret' => env('TIKTOK_CLIENT_SECRET'),
        'redirect_uri'  => env('TIKTOK_REDIRECT_URI'),
    ],
    'ai_engine' => [
        'url'    => env('AI_ENGINE_URL', 'http://localhost:8001'),
        'secret' => env('AI_ENGINE_SHARED_SECRET'),
    ],

];
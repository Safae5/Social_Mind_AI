<?php

namespace App\Services\Social;

use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MetaOAuthService
{
    private string $appId;
    private string $appSecret;
    private string $graphVersion;
    private string $graphBase;
    private string $redirectUri;

    public function __construct()
    {
        $this->appId        = config('services.meta.app_id');
        $this->appSecret    = config('services.meta.app_secret');
        $this->graphVersion = config('services.meta.graph_version', 'v21.0');
        $this->graphBase    = "https://graph.facebook.com/{$this->graphVersion}";
        $this->redirectUri  = config('services.meta.redirect_uri');
    }

    // ── Étape 1 : Construire l'URL d'autorisation ─────────────
    public function buildAuthUrl(string $state): string
    {
        $scopes = implode(',', [
            'instagram_basic',
            'instagram_content_publish',
            'instagram_manage_insights',
            'instagram_manage_comments', // Requis par l'Agent 3 (Répondeur Auto) pour répondre aux commentaires IG
            'pages_read_engagement',
            'pages_manage_engagement',   // Requis par l'Agent 3 (Répondeur Auto) pour répondre/masquer des commentaires Page — pages_read_engagement seul est lecture uniquement, POST /{comment-id}/replies échoue sans ce scope ("missing permissions")
            'pages_manage_posts',
            'pages_show_list',
            'ads_read', // Requis par l'Agent 6 (Ad Optimizer) pour lire les comptes/campagnes publicitaires
            'public_profile',
            // 'email' retiré — rejeté par Meta ("Invalid Scopes: email") avec ce
            // type d'app (Facebook Login for Business), et jamais lu/stocké nulle
            // part dans ce service ni dans MetaOAuthController::callback().
        ]);

        return "https://www.facebook.com/{$this->graphVersion}/dialog/oauth?" . http_build_query([
            'client_id'     => $this->appId,
            'redirect_uri'  => $this->redirectUri,
            'scope'         => $scopes,
            'response_type' => 'code',
            'state'         => $state,
        ]);
    }

    // ── Étape 2 : Échanger le code contre un token ────────────
    public function exchangeCodeForToken(string $code): array
    {
        $response = Http::get("{$this->graphBase}/oauth/access_token", [
            'client_id'     => $this->appId,
            'client_secret' => $this->appSecret,
            'redirect_uri'  => $this->redirectUri,
            'code'          => $code,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Échange de code échoué : ' . $response->body());
        }

        $data = $response->json();

        // Exchange pour un Long-Lived Token (60 jours)
        return $this->exchangeForLongLivedToken($data['access_token']);
    }

    // ── Long-Lived Token (60 jours) ───────────────────────────
    public function exchangeForLongLivedToken(string $shortToken): array
    {
        $response = Http::get("{$this->graphBase}/oauth/access_token", [
            'grant_type'        => 'fb_exchange_token',
            'client_id'         => $this->appId,
            'client_secret'     => $this->appSecret,
            'fb_exchange_token' => $shortToken,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Échange Long-Lived Token échoué : ' . $response->body());
        }

        return $response->json(); // access_token, token_type, expires_in
    }

    // ── Récupère les Pages Facebook associées ─────────────────
    public function getFacebookPages(string $accessToken): array
    {
        $response = Http::get("{$this->graphBase}/me/accounts", [
            'fields'       => 'id,name,access_token,instagram_business_account{id,name,username,followers_count,profile_picture_url}',
            'access_token' => $accessToken,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Récupération pages Facebook échouée');
        }

        return $response->json()['data'] ?? [];
    }

    // ── Récupère le profil Instagram Business ─────────────────
    public function getInstagramProfile(string $igUserId, string $accessToken): array
    {
        $response = Http::get("{$this->graphBase}/{$igUserId}", [
            'fields'       => 'id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,account_type',
            'access_token' => $accessToken,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Récupération profil Instagram échouée');
        }

        return $response->json();
    }

    // ── Sauvegarde le compte Instagram en base ─────────────────
    public function saveInstagramAccount(
        User  $user,
        array $page,
        array $igProfile,
        array $tokenData
    ): SocialAccount {
        $expiresAt = isset($tokenData['expires_in'])
            ? now()->addSeconds((int) $tokenData['expires_in'])
            : now()->addDays(60);

        // updateOrCreateWithTrashed() plutôt que updateOrCreate() : voir
        // SocialAccount::updateOrCreateWithTrashed() — une déconnexion puis
        // reconnexion du même compte doit restaurer la ligne soft-deleted,
        // pas tenter un INSERT en double bloqué par unique(user_id, provider).
        return SocialAccount::updateOrCreateWithTrashed(
            [
                'user_id'          => $user->id,
                'platform'         => 'instagram',
                'platform_user_id' => $igProfile['id'],
            ],
            [
                // `provider` vient de la table d'origine (liaison OAuth de
                // LOGIN — Google/Facebook), toujours NOT NULL avec une
                // contrainte unique(user_id, provider). Les comptes de
                // PUBLICATION (cette méthode) ne le renseignaient jamais →
                // tous retombaient sur '', donc dès qu'un utilisateur
                // connectait un 2e compte (Instagram après Facebook, ou
                // l'inverse), l'INSERT violait la contrainte unique et
                // échouait silencieusement (capturé par le catch générique
                // de MetaOAuthController::callback(), qui affichait juste
                // oauth_error=<message SQL>). Préfixé pour ne jamais entrer
                // en collision avec 'google'/'facebook' du login OAuth.
                'provider'             => 'platform_instagram',
                'platform_username'    => $igProfile['username'] ?? '',
                'platform_display_name'=> $igProfile['name'] ?? '',
                'platform_avatar_url'  => $igProfile['profile_picture_url'] ?? null,
                'page_id'              => $page['id'],
                'page_name'            => $page['name'],
                'access_token'         => $tokenData['access_token'],
                'page_access_token'    => $page['access_token'],
                'token_expires_at'     => $expiresAt,
                'token_refreshed_at'   => now(),
                'followers_count'      => $igProfile['followers_count'] ?? 0,
                'following_count'      => $igProfile['follows_count'] ?? 0,
                'posts_count'          => $igProfile['media_count'] ?? 0,
                'account_type'         => 'business',
                'is_active'            => true,
                'token_valid'          => true,
                'granted_permissions'  => [
                    'instagram_basic', 'instagram_content_publish',
                    'instagram_manage_insights', 'instagram_manage_comments',
                    'pages_manage_posts', 'pages_manage_engagement',
                ],
            ]
        );
    }

    // ── Sauvegarde le compte Facebook Page ─────────────────────
    public function saveFacebookAccount(
        User  $user,
        array $page,
        array $tokenData
    ): SocialAccount {
        $expiresAt = now()->addDays(60);

        // Récupère les infos de la page
        $pageInfo = Http::get("{$this->graphBase}/{$page['id']}", [
            'fields'       => 'id,name,fan_count,picture{url},category',
            'access_token' => $page['access_token'],
        ])->json();

        return SocialAccount::updateOrCreateWithTrashed(
            [
                'user_id'          => $user->id,
                'platform'         => 'facebook',
                'platform_user_id' => $page['id'],
            ],
            [
                // Voir le commentaire équivalent dans saveInstagramAccount() —
                // même contrainte unique(user_id, provider) héritée de la
                // table de login OAuth. 'platform_facebook' pour ne pas
                // entrer en collision avec le 'facebook' du login OAuth
                // (même utilisateur pouvant utiliser les deux).
                'provider'             => 'platform_facebook',
                'platform_username'    => $page['name'],
                'platform_display_name'=> $page['name'],
                'platform_avatar_url'  => $pageInfo['picture']['data']['url'] ?? null,
                'page_id'              => $page['id'],
                'page_name'            => $page['name'],
                'access_token'         => $tokenData['access_token'],
                'page_access_token'    => $page['access_token'],
                'token_expires_at'     => $expiresAt,
                'token_refreshed_at'   => now(),
                'followers_count'      => $pageInfo['fan_count'] ?? 0,
                'account_type'         => 'business',
                'is_active'            => true,
                'token_valid'          => true,
            ]
        );
    }

    // ── Vérification token valide ──────────────────────────────
    public function verifyToken(string $accessToken): bool
    {
        try {
            $response = Http::get("{$this->graphBase}/me", [
                'access_token' => $accessToken,
            ]);
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    // ── Publication Instagram (2 étapes) ──────────────────────
    public function publishInstagramPost(
        SocialAccount $account,
        string        $caption,
        ?string       $imageUrl,
        ?string       $videoUrl,
        string        $postType = 'IMAGE'
    ): array {
        $token    = $account->getDecryptedPageAccessToken() ?? $account->getDecryptedAccessToken();
        $igUserId = $account->platform_user_id;
        // Un compte connecté via "Instagram API with Instagram Login" (sans
        // Page Facebook liée) n'a de jeton valide que sur graph.instagram.com —
        // confirmé en direct : graph.facebook.com rejette ce jeton avec
        // "Invalid OAuth access token - Cannot parse access token". Mêmes
        // chemins/paramètres (/media, /media_publish, image_url, caption,
        // creation_id) des deux côtés, seul l'hôte change — voir aussi
        // meta_fetcher.py (weekly_report) qui a le même branchement.
        $graphBase = $account->isInstagramDirectLogin()
            ? "https://graph.instagram.com/{$this->graphVersion}"
            : $this->graphBase;

        // Étape 1 — Créer le container média
        $containerData = [
            'caption'      => $caption,
            'access_token' => $token,
        ];

        if (strtoupper($postType) === 'REELS' && $videoUrl) {
            $containerData['media_type'] = 'REELS';
            $containerData['video_url']  = $videoUrl;
        } elseif ($imageUrl) {
            // L'API Instagram Content Publishing n'accepte que le JPEG pour
            // image_url (confirmé dans la doc officielle et en direct : un
            // PNG parfaitement accessible échoue quand même avec "Only photo
            // or video can be accepted as media type" / "L'URI du contenu
            // multimédia ne répond pas à nos exigences"). Nos images générées
            // sont en PNG (transparence possible) — on convertit une copie en
            // JPEG juste pour cet appel, sans toucher au PNG original utilisé
            // ailleurs (téléchargement, affichage Content Creator, etc.).
            $containerData['image_url'] = $this->ensureJpegForInstagram($imageUrl);
        } else {
            throw new \Exception('Image ou vidéo requise pour Instagram.');
        }

        $containerResp = Http::post("{$graphBase}/{$igUserId}/media", $containerData);
        if (!$containerResp->successful()) {
            throw new \Exception('Création container IG échouée : ' . $containerResp->body());
        }

        $containerId = $containerResp->json()['id'];

        // Pour les vidéos, attendre que le container soit prêt
        if (strtoupper($postType) === 'REELS') {
            $this->waitForContainer($containerId, $token, $igUserId);
        }

        // Étape 2 — Publier le container
        $publishResp = Http::post("{$graphBase}/{$igUserId}/media_publish", [
            'creation_id'  => $containerId,
            'access_token' => $token,
        ]);

        if (!$publishResp->successful()) {
            throw new \Exception('Publication IG échouée : ' . $publishResp->body());
        }

        $postId = $publishResp->json()['id'];

        // Récupère l'URL du post
        $postInfo = Http::get("{$graphBase}/{$postId}", [
            'fields'       => 'permalink',
            'access_token' => $token,
        ])->json();

        return [
            'post_id'  => $postId,
            'post_url' => $postInfo['permalink'] ?? null,
        ];
    }

    // ── Convertit un PNG local en JPEG pour Instagram ──────────
    // N'agit que sur nos propres fichiers publics (URL préfixée par notre
    // disque 'public') et uniquement si l'extension n'est pas déjà .jpg/.jpeg
    // — toute autre URL (test externe, vidéo, etc.) ressort inchangée.
    private function ensureJpegForInstagram(string $imageUrl): string
    {
        $extension = strtolower(pathinfo(parse_url($imageUrl, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION));
        if (in_array($extension, ['jpg', 'jpeg'])) {
            return $imageUrl;
        }

        $publicBase = rtrim(Storage::disk('public')->url(''), '/') . '/';
        if (!str_starts_with($imageUrl, $publicBase)) {
            // URL externe qu'on ne gère pas (ex. déjà un JPEG hébergé ailleurs) —
            // on la laisse telle quelle plutôt que de deviner.
            return $imageUrl;
        }

        $relativePath = substr($imageUrl, strlen($publicBase));
        $sourcePath   = Storage::disk('public')->path($relativePath);
        if (!is_file($sourcePath) || !function_exists('imagecreatefrompng')) {
            return $imageUrl;
        }

        try {
            $png = @imagecreatefrompng($sourcePath);
            if (!$png) return $imageUrl;

            $width  = imagesx($png);
            $height = imagesy($png);
            $jpg    = imagecreatetruecolor($width, $height);
            $white  = imagecolorallocate($jpg, 255, 255, 255);
            imagefilledrectangle($jpg, 0, 0, $width, $height, $white);
            imagealphablending($jpg, true);
            imagecopy($jpg, $png, 0, 0, 0, 0, $width, $height);

            $jpgRelativePath = preg_replace('/\.[^.]+$/', '.jpg', $relativePath);
            $jpgFullPath     = Storage::disk('public')->path($jpgRelativePath);
            imagejpeg($jpg, $jpgFullPath, 90);

            imagedestroy($png);
            imagedestroy($jpg);

            return Storage::disk('public')->url($jpgRelativePath);
        } catch (\Throwable $e) {
            Log::warning('Conversion JPEG pour Instagram échouée, envoi du fichier original: ' . $e->getMessage());
            return $imageUrl;
        }
    }

    // ── Publication Facebook ───────────────────────────────────
    public function publishFacebookPost(
        SocialAccount $account,
        string        $caption,
        ?string       $imageUrl
    ): array {
        $token  = $account->getDecryptedPageAccessToken();
        $pageId = $account->page_id;

        if ($imageUrl) {
            // Upload direct du binaire ('source', multipart) plutôt que
            // passer 'url' et laisser les serveurs Meta la récupérer eux-
            // mêmes : en dev, image_url pointe sur localhost:8000, que SEULE
            // cette machine peut résoudre — les serveurs Meta ne peuvent
            // jamais l'atteindre et renvoient "Missing or invalid image
            // file" (code 324).
            $imageBytes = LocalMediaFetcher::bytes($imageUrl);

            $response = Http::attach('source', $imageBytes, 'image.png')
                ->post("{$this->graphBase}/{$pageId}/photos", [
                    'message'      => $caption,
                    'published'    => true,
                    'access_token' => $token,
                ]);
        } else {
            $response = Http::post("{$this->graphBase}/{$pageId}/feed", [
                'message'      => $caption,
                'access_token' => $token,
            ]);
        }

        if (!$response->successful()) {
            throw new \Exception('Publication Facebook échouée : ' . $response->body());
        }

        $postId = $response->json()['id'] ?? $response->json()['post_id'];

        return [
            'post_id'  => $postId,
            'post_url' => "https://facebook.com/{$postId}",
        ];
    }

    // ── Attente container vidéo ────────────────────────────────
    private function waitForContainer(string $containerId, string $token, string $igUserId, int $maxAttempts = 10): void
    {
        for ($i = 0; $i < $maxAttempts; $i++) {
            $status = Http::get("{$this->graphBase}/{$containerId}", [
                'fields'       => 'status_code',
                'access_token' => $token,
            ])->json();

            if ($status['status_code'] === 'FINISHED') return;
            if ($status['status_code'] === 'ERROR') {
                throw new \Exception("Container vidéo en erreur.");
            }
            sleep(5);
        }
        throw new \Exception("Timeout — Le container vidéo n'est pas prêt.");
    }
}
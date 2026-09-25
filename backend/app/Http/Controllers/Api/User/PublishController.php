<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\PublishContentRequest;
use App\Models\GeneratedContent;
use App\Models\SocialAccount;
use App\Services\Social\MetaOAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PublishController extends Controller
{
    public function __construct(
        private readonly MetaOAuthService $metaService,
    ) {}

    // ══════════════════════════════════════════════════════════
    // POST /api/content/{id}/publish
    // ══════════════════════════════════════════════════════════

    public function publish(PublishContentRequest $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $content = GeneratedContent::where('user_id', $user->id)->findOrFail($id);

        // Vérifie que le compte appartient à l'utilisateur
        $account = SocialAccount::where('user_id', $user->id)
            ->where('id', $request->social_account_id)
            ->where('is_active', true)
            ->where('token_valid', true)
            ->first();

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Compte social introuvable ou token invalide. Reconnectez votre compte.',
            ], 400);
        }

        // Récupère la variante sélectionnée
        $content->update([
            'selected_variant'  => $request->selected_variant,
            'social_account_id' => $account->id,
            'publish_status'    => 'approved',
        ]);

        $variantData = $content->getSelectedVariantData();
        if (!$variantData) {
            return response()->json([
                'success' => false,
                'message' => 'Variante introuvable.',
            ], 422);
        }

        $finalCaption = $content->getFinalCaption();
        $imageUrl     = $content->getImagePublicUrl();
        $videoUrl     = $content->getVideoPublicUrl();

        // ── Publication selon la plateforme ────────────────────
        try {
            $result = match($account->platform) {
                'instagram' => $this->publishToInstagram($account, $finalCaption, $imageUrl, $videoUrl),
                'facebook'  => $this->publishToFacebook($account, $finalCaption, $imageUrl),
                'tiktok'    => $this->publishToTikTok($account, $finalCaption, $videoUrl),
                'linkedin'  => $this->publishToLinkedIn($account, $finalCaption, $imageUrl),
                'twitter'   => $this->publishToTwitter($account, $finalCaption),
                default     => throw new \Exception("Plateforme non supportée : {$account->platform}"),
            };

            $content->update([
                'publish_status'   => 'published',
                'platform_post_id' => $result['post_id'],
                'platform_post_url'=> $result['post_url'] ?? null,
                'published_at'     => now(),
                'publish_error'    => null,
            ]);

            Log::info("Contenu #{$id} publié sur {$account->platform}", [
                'user_id'  => $user->id,
                'post_id'  => $result['post_id'],
            ]);

            return response()->json([
                'success'  => true,
                'message'  => "✅ Publié avec succès sur {$account->platform} !",
                'data'     => [
                    'post_id'  => $result['post_id'],
                    'post_url' => $result['post_url'] ?? null,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error("Publication échouée pour contenu #{$id}", [
                'error'    => $e->getMessage(),
                'platform' => $account->platform,
            ]);

            $content->update([
                'publish_status' => 'failed',
                'publish_error'  => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => "Échec de la publication : " . $e->getMessage(),
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/content/{id}/cancel
    // ══════════════════════════════════════════════════════════

    public function cancel(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $content = GeneratedContent::where('user_id', $user->id)
            ->whereIn('publish_status', ['draft', 'approved', 'failed'])
            ->findOrFail($id);

        $content->update(['publish_status' => 'draft']);

        return response()->json([
            'success' => true,
            'message' => 'Publication annulée.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // INSTAGRAM — 2 étapes via MetaOAuthService
    // ══════════════════════════════════════════════════════════

    private function publishToInstagram(
        SocialAccount $account,
        string        $caption,
        ?string       $imageUrl,
        ?string       $videoUrl
    ): array {
        return $this->metaService->publishInstagramPost(
            $account,
            $caption,
            $imageUrl,
            $videoUrl,
            $videoUrl ? 'REELS' : 'IMAGE'
        );
    }

    // ══════════════════════════════════════════════════════════
    // FACEBOOK PAGE
    // ══════════════════════════════════════════════════════════

    private function publishToFacebook(
        SocialAccount $account,
        string        $caption,
        ?string       $imageUrl
    ): array {
        return $this->metaService->publishFacebookPost($account, $caption, $imageUrl);
    }

    // ══════════════════════════════════════════════════════════
    // TIKTOK — Content Posting API
    // ══════════════════════════════════════════════════════════

    private function publishToTikTok(
        SocialAccount $account,
        string        $caption,
        ?string       $videoUrl
    ): array {
        if (!$videoUrl) {
            throw new \Exception('TikTok nécessite une vidéo. Générez d\'abord une vidéo.');
        }

        $token = $account->getDecryptedAccessToken();

        $initResponse = Http::withToken($token)->post(
            'https://open.tiktokapis.com/v2/post/publish/video/init/',
            [
                'post_info'   => [
                    'title'           => substr($caption, 0, 150),
                    'privacy_level'   => 'PUBLIC_TO_EVERYONE',
                    'disable_duet'    => false,
                    'disable_comment' => false,
                    'disable_stitch'  => false,
                ],
                'source_info' => [
                    'source'    => 'PULL_FROM_URL',
                    'video_url' => $videoUrl,
                ],
            ]
        );

        if ($initResponse->failed()) {
            throw new \Exception('TikTok init échoué : ' . $initResponse->body());
        }

        $publishId = $initResponse->json()['data']['publish_id'];

        // Polling du statut (max 10 tentatives × 5s = 50s)
        for ($i = 0; $i < 10; $i++) {
            sleep(5);
            $statusResp = Http::withToken($token)->post(
                'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
                ['publish_id' => $publishId]
            );
            $status = $statusResp->json()['data']['status'] ?? '';

            if ($status === 'PUBLISH_COMPLETE') {
                $postId = $statusResp->json()['data']['publicaly_available_post_id'][0] ?? $publishId;
                return ['post_id' => $postId, 'post_url' => null];
            }
            if (in_array($status, ['FAILED', 'PUBLISH_FAILED'])) {
                throw new \Exception("TikTok publication échouée : {$status}");
            }
        }

        throw new \Exception('TikTok publication timeout après 50 secondes.');
    }

    // ══════════════════════════════════════════════════════════
    // LINKEDIN — UGC Posts API
    // ══════════════════════════════════════════════════════════

    private function publishToLinkedIn(
        SocialAccount $account,
        string        $caption,
        ?string       $imageUrl
    ): array {
        $token    = $account->getDecryptedAccessToken();
        $authorId = "urn:li:person:{$account->platform_user_id}";

        $postData = [
            'author'          => $authorId,
            'lifecycleState'  => 'PUBLISHED',
            'specificContent' => [
                'com.linkedin.ugc.ShareContent' => [
                    'shareCommentary'    => ['text' => $caption],
                    'shareMediaCategory' => $imageUrl ? 'IMAGE' : 'NONE',
                ],
            ],
            'visibility' => [
                'com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC',
            ],
        ];

        $response = Http::withToken($token)
            ->withHeaders(['X-Restli-Protocol-Version' => '2.0.0'])
            ->post('https://api.linkedin.com/v2/ugcPosts', $postData);

        if ($response->failed()) {
            throw new \Exception('LinkedIn publication échouée : ' . $response->body());
        }

        $postId = $response->json()['id'];
        return ['post_id' => $postId, 'post_url' => null];
    }

    // ══════════════════════════════════════════════════════════
    // TWITTER/X — API v2
    // ══════════════════════════════════════════════════════════

    private function publishToTwitter(
        SocialAccount $account,
        string        $caption
    ): array {
        $token    = $account->getDecryptedAccessToken();
        $response = Http::withToken($token)
            ->post('https://api.twitter.com/2/tweets', [
                'text' => substr($caption, 0, 280),
            ]);

        if ($response->failed()) {
            throw new \Exception('Twitter publication échouée : ' . $response->body());
        }

        $postId = $response->json()['data']['id'];
        return [
            'post_id'  => $postId,
            'post_url' => "https://twitter.com/i/web/status/{$postId}",
        ];
    }
}
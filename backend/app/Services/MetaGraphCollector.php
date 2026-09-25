<?php

namespace App\Services;

use App\Models\SmAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client Meta Graph API v21 pour la collecte des métriques.
 *
 * Endpoints utilisés :
 *   GET /{ig_user_id}/media?fields=id,timestamp,media_type,like_count,...
 *   GET /{page_id}/posts?fields=id,created_time,message,reactions,...
 *   GET /{page_id}/insights?metric=page_impressions,page_reach,...
 *
 * Utilisé par CollectMetricsJob (dispatché toutes les 6 heures).
 */
class MetaGraphCollector
{
    private string $graphBase;

    public function __construct()
    {
        $version         = config('services.meta.graph_version', 'v21.0');
        $this->graphBase = "https://graph.facebook.com/{$version}";
    }

    /**
     * Collecte les métriques Instagram Business via Meta Graph API v21.
     * Endpoint : GET /{ig-user-id}/media
     * Champs   : id, timestamp, like_count, comments_count, reach, impressions, saved, media_type
     */
    public function collectInstagramMetrics(SmAccount $account): array
    {
        $token   = $account->getDecryptedAccessToken();
        $userId  = $account->ig_user_id ?? $account->account_id;
        $metrics = [];

        try {
            $response = Http::timeout(30)->get(
                "{$this->graphBase}/{$userId}/media",
                [
                    'fields'       => 'id,timestamp,media_type,like_count,comments_count,reach,impressions,saved',
                    'access_token' => $token,
                    'limit'        => 50,
                ]
            );

            if ($response->failed()) {
                Log::error("Meta Graph API erreur Instagram: " . $response->body());
                return [];
            }

            foreach ($response->json()['data'] ?? [] as $post) {
                $metrics[] = [
                    'platform_post_id' => $post['id'],
                    'platform'         => 'instagram',
                    'content_type'     => $this->mapMediaType($post['media_type'] ?? 'IMAGE'),
                    'likes'            => $post['like_count']     ?? 0,
                    'comments'         => $post['comments_count'] ?? 0,
                    'shares'           => 0,
                    'reach'            => $post['reach']          ?? 0,
                    'impressions'      => $post['impressions']    ?? 0,
                    'saves'            => $post['saved']          ?? 0,
                    'posted_at'        => $post['timestamp']      ?? null,
                    'source'           => 'meta_api',
                ];
            }

            Log::info("Meta Graph API Instagram — {$userId} : " . count($metrics) . " posts collectés");

        } catch (\Exception $e) {
            Log::error("Erreur collecte Instagram {$userId}: " . $e->getMessage());
        }

        return $metrics;
    }

    /**
     * Collecte les métriques Facebook Page via Meta Graph API v21.
     * Endpoint : GET /{page_id}/posts avec reactions, comments, shares
     */
    public function collectFacebookMetrics(SmAccount $account): array
    {
        $token   = $account->getDecryptedAccessToken();
        $pageId  = $account->account_id;
        $metrics = [];

        try {
            $response = Http::timeout(30)->get(
                "{$this->graphBase}/{$pageId}/posts",
                [
                    'fields'       => 'id,created_time,message,reactions.summary(true),comments.summary(true),shares',
                    'access_token' => $token,
                    'limit'        => 50,
                ]
            );

            if ($response->failed()) {
                Log::error("Meta Graph API erreur Facebook: " . $response->body());
                return [];
            }

            foreach ($response->json()['data'] ?? [] as $post) {
                $metrics[] = [
                    'platform_post_id' => $post['id'],
                    'platform'         => 'facebook',
                    'content_type'     => 'Post',
                    'likes'            => $post['reactions']['summary']['total_count'] ?? 0,
                    'comments'         => $post['comments']['summary']['total_count']  ?? 0,
                    'shares'           => $post['shares']['count']                     ?? 0,
                    'reach'            => 0,
                    'impressions'      => 0,
                    'saves'            => 0,
                    'posted_at'        => $post['created_time'] ?? null,
                    'source'           => 'meta_api',
                ];
            }

        } catch (\Exception $e) {
            Log::error("Erreur collecte Facebook {$pageId}: " . $e->getMessage());
        }

        return $metrics;
    }

    private function mapMediaType(string $type): string
    {
        return match(strtoupper($type)) {
            'VIDEO'          => 'Vidéo',
            'CAROUSEL_ALBUM' => 'Carrousel',
            'REELS', 'REEL'  => 'Reel',
            'IMAGE'          => 'Photo',
            default          => 'Post',
        };
    }
}
<?php

namespace App\Services;

use App\Models\CiCompetitorAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Collecte les données PUBLIQUES des concurrents via Meta Graph API v21.
 *
 * Endpoints (données publiques uniquement) :
 *   GET /{ig_user_id}/media?fields=id,timestamp,media_type,like_count,comments_count
 *   GET /{ig_user_id}?fields=id,username,name,biography,followers_count,media_count
 *   GET /{page_id}/posts?fields=id,message,created_time,likes.summary(true),...
 *
 * Permissions requises :
 *   instagram_basic, pages_read_engagement
 */
class MetaCompetitorCollector
{
    private string $graphBase;

    public function __construct()
    {
        $version         = config('services.meta.graph_version', 'v21.0');
        $this->graphBase = "https://graph.facebook.com/{$version}";
    }

    /**
     * Collecte les médias publics d'un compte Instagram concurrent via
     * Business Discovery.
     *
     * L'implémentation précédente appelait directement
     * GET /{account->platform_id}/media avec le token DU PROFESSIONNEL —
     * ça ne fonctionne que si ce token gère le compte {platform_id} lui-même.
     * Un concurrent est par définition un compte qu'on NE gère PAS : cet
     * appel échoue toujours (permission refusée) pour un vrai concurrent,
     * quel que soit platform_id. La seule API Meta prévue pour consulter les
     * métriques PUBLIQUES d'un compte Instagram Business qu'on ne possède
     * pas est Business Discovery : GET /{mon_ig_user_id}?fields=
     * business_discovery.username({cible}){...}, avec le nom d'utilisateur
     * (pas un ID numérique que l'agence n'a de toute façon aucun moyen de
     * connaître pour un concurrent). Nécessite un compte Instagram Business
     * connecté (instagram_basic) côté professionnel.
     *
     * @param  CiCompetitorAccount $account      Concurrent (ci_competitor_accounts)
     * @param  string              $accessToken  Token Meta Graph du PROFESSIONNEL (instagram_basic)
     * @param  string|null         $ownIgUserId  ID du compte Instagram Business du professionnel
     * @return array               Liste des posts publics
     */
    public function collectInstagramMedia(CiCompetitorAccount $account,
                                           string $accessToken,
                                           ?string $ownIgUserId): array
    {
        $username = ltrim((string) ($account->username ?: ''), '@');

        if (!$ownIgUserId) {
            Log::warning("MetaCompetitor: aucun compte Instagram Business connecté côté professionnel — Business Discovery impossible pour @{$username}.");
            return [];
        }
        if (!$username) {
            return [];
        }

        $posts = [];

        try {
            $resp = Http::timeout(30)->get(
                "{$this->graphBase}/{$ownIgUserId}",
                [
                    'fields' => "business_discovery.username({$username})"
                        . '{followers_count,media_count,name,biography,'
                        . 'media.limit(50).since(' . now()->subDays(30)->timestamp . ')'
                        . '{id,timestamp,media_type,caption,like_count,comments_count}}',
                    'access_token' => $accessToken,
                ]
            );

            if ($resp->failed()) {
                Log::warning("MetaCompetitor: Business Discovery échouée pour @{$username} — " . $resp->body());
                return [];
            }

            $discovery = $resp->json()['business_discovery'] ?? null;
            if (!$discovery) {
                Log::warning("MetaCompetitor: @{$username} introuvable via Business Discovery (compte privé, inexistant, ou pas un compte Business/Creator).");
                return [];
            }

            foreach ($discovery['media']['data'] ?? [] as $item) {
                $content_type = match($item['media_type'] ?? 'IMAGE') {
                    'VIDEO'          => 'Reel',
                    'CAROUSEL_ALBUM' => 'Carrousel',
                    default          => 'Post',
                };

                $posts[] = [
                    'competitor'     => $account->name,
                    'platform'       => 'instagram',
                    'post_id'        => $item['id'] ?? null,
                    'caption'        => $item['caption']       ?? '',
                    'content_type'   => $content_type,
                    'likes'          => $item['like_count']    ?? 0,
                    'comments'       => $item['comments_count']?? 0,
                    'shares'         => 0,
                    'reach'          => 0,
                    'hashtags'       => $this->extractHashtags($item['caption'] ?? ''),
                    'date'           => $item['timestamp']     ?? now()->toISOString(),
                    'source'         => 'meta_graph',
                    'followers_count'=> $discovery['followers_count'] ?? 0,
                ];
            }

            if (!empty($discovery['followers_count'])) {
                $account->update(['followers_count' => $discovery['followers_count']]);
            }

            Log::info("MetaCompetitor Instagram @{$username} : " . count($posts) . " posts (Business Discovery)");

        } catch (\Exception $e) {
            Log::error("MetaCompetitorCollector Instagram : " . $e->getMessage());
        }

        return $posts;
    }

    /**
     * Collecte les publications publiques d'une Page Facebook concurrente.
     */
    public function collectFacebookPagePosts(CiCompetitorAccount $account,
                                              string $accessToken): array
    {
        // Comme pour Instagram, exiger platform_id (un ID numérique de Page)
        // n'est pas réaliste : une agence ne le connaît jamais pour un
        // concurrent. Le nom d'utilisateur/vanity URL de la Page fonctionne
        // comme identifiant d'objet Graph API au même titre que l'ID
        // numérique pour les appels de lecture publics.
        $pageIdentifier = $account->platform_id ?: ltrim((string) ($account->username ?: ''), '@');
        if (!$pageIdentifier) {
            return [];
        }
        if (preg_match('/\s/', $pageIdentifier)) {
            // Un identifiant Graph API valide (username ou ID numérique) ne
            // contient jamais d'espace — celui-ci vient presque sûrement du
            // NOM D'AFFICHAGE de la page ("Fitness Gym") tapé dans le champ
            // username plutôt que son identifiant réel. La requête échouerait
            // de toute façon (espace non encodable dans ce segment d'URL) ;
            // autant le dire clairement plutôt que de laisser échouer
            // silencieusement sans explication.
            Log::warning("MetaCompetitor: identifiant Facebook invalide pour \"{$account->name}\" (\"{$pageIdentifier}\" contient un espace) — renseignez l'URL réelle de la Page (profile_url), pas son nom affiché.");
            return [];
        }

        $posts = [];

        try {
            $resp = Http::timeout(30)->get(
                "{$this->graphBase}/{$pageIdentifier}/posts",
                [
                    'fields'       => 'id,message,created_time,likes.summary(true),comments.summary(true),shares',
                    'since'        => now()->subDays(30)->timestamp,
                    'access_token' => $accessToken,
                    'limit'        => 50,
                ]
            );

            if ($resp->failed()) {
                Log::warning("MetaCompetitor: publications inaccessibles pour \"{$account->name}\" ({$pageIdentifier}) — " . $resp->body());
                return [];
            }

            foreach ($resp->json()['data'] ?? [] as $post) {
                $posts[] = [
                    'competitor'  => $account->name,
                    'platform'    => 'facebook',
                    'post_id'     => $post['id'] ?? null,
                    'caption'     => $post['message'] ?? '',
                    'content_type'=> 'Post',
                    'likes'       => $post['likes']['summary']['total_count']    ?? 0,
                    'comments'    => $post['comments']['summary']['total_count'] ?? 0,
                    'shares'      => $post['shares']['count'] ?? 0,
                    'reach'       => 0,
                    'hashtags'    => $this->extractHashtags($post['message'] ?? ''),
                    'date'        => $post['created_time'] ?? now()->toISOString(),
                    'source'      => 'meta_graph',
                ];
            }

        } catch (\Exception $e) {
            Log::error("MetaCompetitorCollector Facebook : " . $e->getMessage());
        }

        return $posts;
    }

    private function extractHashtags(string $text): string
    {
        preg_match_all('/#\w+/', $text, $matches);
        return implode(' ', $matches[0]);
    }
}
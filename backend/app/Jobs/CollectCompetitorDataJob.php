<?php

namespace App\Jobs;

use App\Models\AgentActivityLog;
use App\Models\CiCompetitorAccount;
use App\Models\CiCompetitorPost;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\MetaCompetitorCollector;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Job de collecte quotidienne des données PUBLIQUES des concurrents.
 * Dispatché par Laravel Scheduler → dailyAt('02:00').
 *
 * Flux :
 *   1. Récupère les ci_competitor_accounts actifs (max 10)
 *   2. Meta Graph API → Instagram + Facebook (données publiques)
 *   3. Stocke dans ci_competitor_posts (upsert)
 *   4. Nettoie les posts > 60 jours
 *
 * TikTok/LinkedIn ne sont PAS collectés — aucun scraping Playwright n'est
 * implémenté pour cet agent (contrairement à Content Strategist / Social
 * Manager qui en ont un réel) et il n'y a pas d'intégration API TikTok.
 * CompetitiveIntelController::store() bloque désormais leur création avec
 * un message clair plutôt que de laisser cette étape les ignorer en silence.
 */
class CollectCompetitorDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600; // 10 minutes max

    public function __construct(private readonly User $user) {}

    public function handle(MetaCompetitorCollector $metaCollector): void
    {
        Log::info("CollectCompetitorData start — user #{$this->user->id}");

        // Récupère les comptes concurrents actifs (max 10)
        $competitors = CiCompetitorAccount::where('user_id', $this->user->id)
            ->active()
            ->take(10)
            ->get();

        if ($competitors->isEmpty()) {
            Log::info("Aucun concurrent actif pour user #{$this->user->id}");
            return;
        }

        // Token Meta Graph API du professionnel — User::metaAccessToken n'a
        // jamais existé (aucune colonne/relation de ce nom sur User), donc
        // $metaToken était TOUJOURS null et cette collecte n'a jamais pu
        // récupérer la moindre donnée réelle, pour aucun utilisateur, tout
        // en se loggant "success" avec 0 posts (échec silencieux). Même
        // source de token que les autres agents Meta : le compte Facebook
        // Page connecté (SocialAccount, cf. rule 6 — pas de nouveau système).
        // provider='platform_facebook'/'platform_instagram' identifie une
        // vraie liaison de PUBLICATION (Agent 1 OAuth) — provider='meta' est
        // un reliquat de l'ancien flux de LOGIN social et peut contenir un
        // platform_user_id factice (constaté en direct : "audit_test_
        // platform_id", pas un vrai ID Meta), donc filtrer sur platform seul
        // remontait cette ligne au lieu de détecter correctement l'absence
        // de connexion Instagram réelle.
        $fbAccount   = SocialAccount::where('user_id', $this->user->id)->where('provider', 'platform_facebook')->first();
        $igAccount   = SocialAccount::where('user_id', $this->user->id)->where('provider', 'platform_instagram')->first();
        $metaToken   = $fbAccount?->getDecryptedPageAccessToken() ?? $fbAccount?->getDecryptedAccessToken();
        $ownIgUserId = $igAccount?->platform_user_id;
        $allPosts    = 0;

        foreach ($competitors as $competitor) {
            Log::info("Collecte : {$competitor->name} ({$competitor->platform})");

            $posts = [];

            // ── Meta Graph API ────────────────────────────────
            if ($metaToken) {
                $posts = match($competitor->platform) {
                    'instagram' => $metaCollector->collectInstagramMedia($competitor, $metaToken, $ownIgUserId),
                    'facebook'  => $metaCollector->collectFacebookPagePosts($competitor, $metaToken),
                    default     => (function () use ($competitor) {
                        Log::warning("CollectCompetitorData : plateforme \"{$competitor->platform}\" non collectée (concurrent #{$competitor->id}) — aucun collecteur implémenté.");
                        return [];
                    })(),
                };
            }

            // ── Sauvegarder dans ci_competitor_posts ──────────
            foreach ($posts as $post) {
                CiCompetitorPost::updateOrCreate(
                    [
                        'user_id'                   => $this->user->id,
                        'ci_competitor_account_id'  => $competitor->id,
                        'post_id'                   => $post['post_id'] ?? null,
                        'platform'                  => $post['platform'] ?? $competitor->platform,
                    ],
                    [
                        'competitor'   => $post['competitor']   ?? $competitor->name,
                        'caption'      => $post['caption']      ?? null,
                        'content_type' => $post['content_type'] ?? 'Post',
                        'likes'        => $post['likes']        ?? 0,
                        'comments'     => $post['comments']     ?? 0,
                        'shares'       => $post['shares']       ?? 0,
                        'reach'        => $post['reach']        ?? 0,
                        'hashtags'     => $post['hashtags']     ?? null,
                        'posted_at'    => $post['date']         ?? now(),
                        'source'       => $post['source']       ?? 'meta_graph',
                    ]
                );
            }

            $competitor->update(['last_scraped_at' => now()]);
            $allPosts += count($posts);
        }

        // Nettoyer les posts > 60 jours
        CiCompetitorPost::where('user_id', $this->user->id)
            ->where('created_at', '<', now()->subDays(60))
            ->delete();

        // Log activité Agent 7
        AgentActivityLog::create([
            'user_id'    => $this->user->id,
            'agent_slug' => 'competitive-intel',
            'agent_name' => 'Agent Veille Concurrentielle',
            'action'     => 'competitor_data_collected',
            'description'=> "Collecte quotidienne — {$allPosts} posts — {$competitors->count()} concurrents — ci_competitor_posts",
            'status'     => 'success',
            'metadata'   => ['total_posts' => $allPosts, 'n_competitors' => $competitors->count()],
            'completed_at'=> now(),
        ]);

        Log::info("CollectCompetitorData done — user #{$this->user->id} : {$allPosts} posts dans ci_competitor_posts");
    }
}
<?php

namespace App\Http\Controllers\Api\Professional\Agents;

use App\Http\Controllers\Controller;
use App\Models\AgentActivityLog;
use App\Models\CcPack;
use App\Models\SmAccount;
use App\Services\Social\LocalMediaFetcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ContentCreatorPublishController extends Controller
{
    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/content-creator/{id}/approve
    // Approuver sans publier encore
    // ══════════════════════════════════════════════════════════

    public function approve(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $pack = CcPack::where('user_id', $user->id)
            ->where('publish_status', 'pending')
            ->findOrFail($id);

        $pack->update(['publish_status' => 'approved']);

        return response()->json([
            'success' => true,
            'message' => '✅ Pack approuvé — prêt pour publication.',
            'status'  => 'approved',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/content-creator/{id}/reject
    // ══════════════════════════════════════════════════════════

    public function reject(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $pack = CcPack::where('user_id', $user->id)->findOrFail($id);

        $pack->update([
            'publish_status' => 'rejected',
            'publish_error'  => $request->input('reason', 'Contenu rejeté'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pack rejeté.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/content-creator/{id}/publish
    // Publication via Meta Graph API v21
    // Workflow : approve → publish (2 étapes Instagram)
    // ══════════════════════════════════════════════════════════

    public function publish(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'sm_account_id' => 'required|integer|exists:sm_accounts,id',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();
        $pack = CcPack::where('user_id', $user->id)
            ->whereIn('publish_status', ['pending', 'approved'])
            ->findOrFail($id);

        // Vérifier que le compte sm_accounts appartient au professionnel
        $account = SmAccount::where('user_id', $user->id)
            ->where('id', $request->sm_account_id)
            ->active()
            ->firstOrFail();

        $pack->update([
            'sm_account_id' => $account->id,
            'publish_status'=> 'approved',
        ]);

        $fullCaption = $pack->fullCaption();

        try {
            // Routage sur la plateforme réelle du compte sélectionné, pas celle
            // du pack — c'est le compte qui détermine la forme de l'appel Graph API.
            $result = $this->publishToMetaGraphApi(
                $account,
                $fullCaption,
                $pack->imagePublicUrl(),
                $account->platform
            );

            $pack->update([
                'publish_status'    => 'published',
                'platform_post_id'  => $result['post_id'],
                'platform_post_url' => $result['post_url'] ?? null,
                'published_at'      => now(),
            ]);

            AgentActivityLog::create([
                'user_id'    => $user->id,
                'client_id'  => $pack->client_id,
                'agent_slug' => 'content-creator',
                'agent_name' => 'Agent Créateur de Contenu IA',
                'action'     => 'pack_published',
                'description'=> "Pack publié sur {$account->platform} — {$pack->client_name}",
                'status'     => 'success',
                'metadata'   => [
                    'pack_id'   => $pack->id,
                    'platform'  => $pack->platform,
                    'post_id'   => $result['post_id'],
                    'post_url'  => $result['post_url'] ?? null,
                ],
                'completed_at' => now(),
            ]);

            return response()->json([
                'success'           => true,
                'message'           => "✅ Publié sur {$account->platform} !",
                'platform_post_id'  => $result['post_id'],
                'platform_post_url' => $result['post_url'] ?? null,
                'published_at'      => now()->toIso8601String(),
            ]);

        } catch (\Exception $e) {
            Log::error("CcPack #$id publication échouée: " . $e->getMessage());
            $pack->update([
                'publish_status' => 'failed',
                'publish_error'  => $e->getMessage(),
            ]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ── Meta Graph API v21 — routage par plateforme réelle du compte ──
    private function publishToMetaGraphApi(
        SmAccount $account,
        string    $caption,
        ?string   $imageUrl,
        string    $platform
    ): array {
        if (!$imageUrl) {
            throw new \Exception("Image requise pour publier sur {$platform}");
        }

        return match ($platform) {
            'instagram' => $this->publishToInstagram($account, $caption, $imageUrl),
            'facebook'  => $this->publishToFacebook($account, $caption, $imageUrl),
            default     => throw new \Exception(
                "Publication directe non disponible pour la plateforme \"{$platform}\". "
                . "Seuls Instagram et Facebook sont supportés actuellement."
            ),
        };
    }

    // Instagram Business : toujours 2 étapes (/{id}/media → /{id}/media_publish)
    // Contrainte réelle de l'API (pas un choix d'implémentation) : /media
    // pour une image n'accepte QUE image_url, une URL publique que Meta
    // récupère lui-même — contrairement à /{page-id}/photos (Facebook), il
    // n'existe pas d'upload binaire multipart pour créer un container image
    // Instagram. En dev local (APP_URL = localhost), Meta ne peut jamais
    // atteindre cette URL et cet appel échouera avec "Missing or invalid
    // image file" quel que soit le code — un tunnel public (ngrok ou
    // équivalent) est nécessaire pour tester la publication Instagram en
    // local, ce n'est pas un bug à corriger côté code.
    private function publishToInstagram(SmAccount $account, string $caption, string $imageUrl): array
    {
        $graphBase = "https://graph.facebook.com/" . config('services.meta.graph_version', 'v21.0');
        $token     = $account->getDecryptedAccessToken();
        $userId    = $account->ig_user_id ?? $account->account_id;

        $containerResponse = Http::post(
            "{$graphBase}/{$userId}/media",
            [
                'image_url'    => $imageUrl,
                'caption'      => $caption,
                'access_token' => $token,
            ]
        );

        if ($containerResponse->failed()) {
            throw new \Exception('Erreur création container Meta: ' . $containerResponse->body());
        }

        $containerId = $containerResponse->json()['id'];

        $publishResponse = Http::post(
            "{$graphBase}/{$userId}/media_publish",
            [
                'creation_id'  => $containerId,
                'access_token' => $token,
            ]
        );

        if ($publishResponse->failed()) {
            throw new \Exception('Erreur publication Meta: ' . $publishResponse->body());
        }

        $postId = $publishResponse->json()['id'];

        return [
            'post_id'  => $postId,
            'post_url' => "https://www.instagram.com/p/{$postId}/",
        ];
    }

    // Facebook Page : publication directe en une étape (/{page-id}/photos)
    private function publishToFacebook(SmAccount $account, string $caption, string $imageUrl): array
    {
        $graphBase = "https://graph.facebook.com/" . config('services.meta.graph_version', 'v21.0');
        $token     = $account->getDecryptedAccessToken();
        $pageId    = $account->page_id ?? $account->account_id;

        // Upload direct du binaire ('source', multipart) plutôt que passer
        // 'url' et laisser les serveurs Meta la récupérer eux-mêmes : en
        // dev, $imageUrl pointe sur localhost:8000, que SEULE cette machine
        // peut résoudre — Meta renvoie alors "Missing or invalid image
        // file" (code 324). Même correctif que MetaOAuthService::
        // publishFacebookPost(), voir LocalMediaFetcher.
        $imageBytes = LocalMediaFetcher::bytes($imageUrl);

        $response = Http::attach('source', $imageBytes, 'image.png')->post(
            "{$graphBase}/{$pageId}/photos",
            [
                'caption'      => $caption,
                'access_token' => $token,
            ]
        );

        if ($response->failed()) {
            throw new \Exception('Erreur publication Facebook: ' . $response->body());
        }

        $data   = $response->json();
        $postId = $data['post_id'] ?? $data['id'];

        return [
            'post_id'  => $postId,
            'post_url' => "https://www.facebook.com/{$postId}",
        ];
    }
}
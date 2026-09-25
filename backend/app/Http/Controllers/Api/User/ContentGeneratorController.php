<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\GenerateContentRequest;
use App\Http\Resources\GeneratedContentResource;
use App\Models\AgentActivityLog;
use App\Models\GeneratedContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ContentGeneratorController extends Controller
{
    private string $aiEngineUrl;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/content/generate
    // ══════════════════════════════════════════════════════════

    public function generate(GenerateContentRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user          = $request->user();
        $brandExamples = $request->getBrandExamples();
        $startedAt     = now();

        // ── 1. Appel AI Engine FastAPI ─────────────────────────
        try {
            $aiResponse = Http::timeout(300)
                ->post("{$this->aiEngineUrl}/content/generate", [
                    'subject'        => $request->subject,
                    'platform'       => $request->platform,
                    'tone'           => $request->tone,
                    'language'       => $request->language ?? 'Français',
                    'extra_context'  => $request->extra_context ?? '',
                    'brand_examples' => $brandExamples,
                    'generate_image' => $request->boolean('generate_image', true),
                    'generate_video' => $request->boolean('generate_video', false),
                ]);

            if ($aiResponse->failed()) {
                Log::error('AI Engine generate failed', [
                    'status'   => $aiResponse->status(),
                    'response' => $aiResponse->body(),
                ]);
                AgentActivityLog::create([
                    'user_id'      => $user->id,
                    'agent_slug'   => 'content-generator',
                    'agent_name'   => 'Générateur de Contenu',
                    'action'       => 'content_generation',
                    'status'       => 'error',
                    'error_message'=> "HTTP {$aiResponse->status()}",
                    'started_at'   => $startedAt,
                    'completed_at' => now(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur AI Engine — vérifiez que le serveur Python tourne sur le port 8001.',
                    'details' => $aiResponse->json(),
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('AI Engine connection failed', ['error' => $e->getMessage()]);
            AgentActivityLog::create([
                'user_id'      => $user->id,
                'agent_slug'   => 'content-generator',
                'agent_name'   => 'Générateur de Contenu',
                'action'       => 'content_generation',
                'status'       => 'error',
                'error_message'=> $e->getMessage(),
                'started_at'   => $startedAt,
                'completed_at' => now(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Impossible de joindre l\'AI Engine : ' . $e->getMessage(),
            ], 503);
        }

        $aiData = $aiResponse->json();

        // ── 2. Sauvegarde les fichiers générés ─────────────────
        $imagePath = null;
        $videoPath = null;

        if (!empty($aiData['image_base64'])) {
            try {
                $imageData = base64_decode($aiData['image_base64']);
                $imagePath = 'generated/images/' . $user->id . '/' . uniqid('img_') . '.png';
                Storage::disk('public')->put($imagePath, $imageData);
            } catch (\Exception $e) {
                Log::warning('Image save failed', ['error' => $e->getMessage()]);
            }
        }

        if (!empty($aiData['video_base64'])) {
            try {
                $videoData = base64_decode($aiData['video_base64']);
                $videoPath = 'generated/videos/' . $user->id . '/' . uniqid('vid_') . '.mp4';
                Storage::disk('public')->put($videoPath, $videoData);
            } catch (\Exception $e) {
                Log::warning('Video save failed', ['error' => $e->getMessage()]);
            }
        }

        // ── 3. Sauvegarde en base de données ───────────────────
        $content = GeneratedContent::create([
            'user_id'                   => $user->id,
            'subject'                   => $request->subject,
            'platform'                  => $request->platform,
            'tone'                      => $request->tone,
            'language'                  => $request->language ?? 'Français',
            'extra_context'             => $request->extra_context,
            'brand_examples'            => $brandExamples,
            'variants'                  => $aiData['variants'] ?? [],
            'image_path'                => $imagePath,
            'video_path'                => $videoPath,
            // Storage::disk('public') explicitement : le fichier est écrit sur
            // le disk 'public' juste au-dessus, mais Storage::url() sans disk
            // résout sur le disk PAR DÉFAUT ('local', FILESYSTEM_DISK non
            // défini dans .env) — qui n'a pas de clé 'url' configurée, donc
            // retombe sur un chemin relatif "/storage/..." sans host. Ça ne
            // casse rien en prod (front et back sur le même domaine), mais en
            // dev (front :5173, back :8000, Vite ne proxy que /api) ce chemin
            // relatif pointe vers le mauvais serveur → image cassée dans <img>.
            'image_url'                 => $imagePath ? Storage::disk('public')->url($imagePath) : null,
            'video_url'                 => $videoPath ? Storage::disk('public')->url($videoPath) : null,
            'brand_voice_dominant_tone' => $aiData['brand_voice_info']['dominant_tone'] ?? null,
            'brand_voice_n_examples'    => $aiData['brand_voice_info']['n_examples'] ?? 0,
            'social_account_id'         => $request->social_account_id,
            'publish_status'            => 'draft',
        ]);

        AgentActivityLog::create([
            'user_id'      => $user->id,
            'agent_slug'   => 'content-generator',
            'agent_name'   => 'Générateur de Contenu',
            'action'       => 'content_generation',
            'description'  => "Contenu #{$content->id} généré pour {$request->platform}",
            'status'       => 'success',
            'started_at'   => $startedAt,
            'completed_at' => now(),
            'metadata'     => ['content_id' => $content->id],
        ]);

        return response()->json([
            'success'          => true,
            'message'          => '✅ Contenu généré avec succès !',
            'content_id'       => $content->id,
            'variants'         => $content->variants,
            'image_url'        => $content->getImagePublicUrl(),
            'video_url'        => $content->getVideoPublicUrl(),
            'brand_voice_info' => [
                'n_examples'    => $content->brand_voice_n_examples,
                'dominant_tone' => $content->brand_voice_dominant_tone,
            ],
        ], 201);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/content
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $contents = GeneratedContent::forUser($user->id)
            ->orderByDesc('created_at')
            ->take(20)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => ['contents' => GeneratedContentResource::collection($contents)],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/content/{id}
    // ══════════════════════════════════════════════════════════

    public function show(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $content = GeneratedContent::forUser($user->id)
            ->with('socialAccount')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => ['content' => new GeneratedContentResource($content)],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/content/{id}/download/image
    // ══════════════════════════════════════════════════════════

    public function downloadImage(Request $request, int $id)
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $content = GeneratedContent::forUser($user->id)->findOrFail($id);

        if (!$content->image_path || !Storage::disk('public')->exists($content->image_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Image non disponible.',
            ], 404);
        }

        $filename = "social_mind_image_{$content->platform}_{$id}.png";
        return Storage::disk('public')->download($content->image_path, $filename);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/content/{id}/download/video
    // ══════════════════════════════════════════════════════════

    public function downloadVideo(Request $request, int $id)
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $content = GeneratedContent::forUser($user->id)->findOrFail($id);

        if (!$content->video_path || !Storage::disk('public')->exists($content->video_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Vidéo non disponible.',
            ], 404);
        }

        $filename = "social_mind_video_{$content->platform}_{$id}.mp4";
        return Storage::disk('public')->download($content->video_path, $filename);
    }
}
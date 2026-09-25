<?php

namespace App\Http\Controllers\Api\Professional\Agents;

use App\Http\Controllers\Controller;
use App\Models\AgentActivityLog;
use App\Models\CcPack;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ContentCreatorController extends Controller
{
    private string $aiEngineUrl;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/content-creator/generate
    // Pipeline : Mistral 7B (légende) + SDXL-Turbo (image)
    //          + Mistral 7B (script) + ReportLab (PDF)
    // ══════════════════════════════════════════════════════════

    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'client_id'         => 'nullable|integer|exists:clients,id',
            'client_name'       => 'required|string|max:200',
            'client_niche'      => 'nullable|string|max:200',
            'client_audience'   => 'nullable|string|max:500',
            'client_brand_tone' => 'nullable|string|max:100',
            'platform'          => 'required|in:instagram,tiktok,facebook,linkedin,twitter',
            'subject'           => 'required|string|max:1000',
            'tone'              => 'nullable|string|max:100',
            'language'          => 'nullable|string|max:50',
            'generate_image'    => 'boolean',
            'generate_script'   => 'boolean',
            'generate_pdf'      => 'boolean',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        // Log démarrage
        AgentActivityLog::create([
            'user_id'    => $user->id,
            'client_id'  => $request->client_id,
            'agent_slug' => 'content-creator',
            'agent_name' => 'Agent Créateur de Contenu IA',
            'action'     => 'pack_generation_started',
            'description'=> "Génération pack contenu {$request->platform} — {$request->client_name} — sujet : " . substr($request->subject, 0, 50),
            'status'     => 'running',
            'started_at' => now(),
            'metadata'   => [
                'platform'       => $request->platform,
                'generate_image' => $request->boolean('generate_image', true),
                'generate_script'=> $request->boolean('generate_script', true),
            ],
        ]);

        try {
            // ── Appel AI Engine ────────────────────────────────
            $response = Http::timeout(600)->post(
                "{$this->aiEngineUrl}/content-creator/generate",
                [
                    'client_id'        => $request->client_id ?? 0,
                    'client_name'      => $request->client_name,
                    'client_niche'     => $request->client_niche     ?? '',
                    'client_audience'  => $request->client_audience  ?? '',
                    'client_brand_tone'=> $request->client_brand_tone ?? 'professionnel',
                    'platform'         => $request->platform,
                    'subject'          => $request->subject,
                    'tone'             => $request->tone     ?? 'professionnel',
                    'language'         => $request->language ?? 'Français',
                    'generate_image'   => $request->boolean('generate_image',  true),
                    'generate_script'  => $request->boolean('generate_script', true),
                    'generate_pdf'     => $request->boolean('generate_pdf',    true),
                ]
            );

            if ($response->failed()) {
                throw new \Exception("AI Engine erreur : " . $response->body());
            }

        } catch (\Exception $e) {
            Log::error("ContentCreator AI Engine: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 503);
        }

        $ai = $response->json();

        // ── Sauvegarde PNG SDXL-Turbo ──────────────────────
        $imagePath = null;
        $imageUrl  = null;
        if (!empty($ai['image_base64'])) {
            try {
                $imageData = base64_decode($ai['image_base64']);
                $imagePath = "cc_packs/{$user->id}/" . uniqid('img_') . '.png';
                Storage::disk('public')->put($imagePath, $imageData);
                $imageUrl  = Storage::disk('public')->url($imagePath);
            } catch (\Exception $e) {
                Log::warning("CcPack image save error: " . $e->getMessage());
            }
        }

        // ── Sauvegarde PDF ReportLab ───────────────────────
        $pdfPath = null;
        $pdfUrl  = null;
        if (!empty($ai['pdf_base64'])) {
            try {
                $pdfData = base64_decode($ai['pdf_base64']);
                $pdfPath = "cc_packs/pdfs/{$user->id}/" . uniqid('pdf_') . '.pdf';
                Storage::disk('public')->put($pdfPath, $pdfData);
                $pdfUrl  = Storage::disk('public')->url($pdfPath);
            } catch (\Exception $e) {
                Log::warning("CcPack pdf save error: " . $e->getMessage());
            }
        }

        // ── Sauvegarde en base (table cc_packs) ────────────
        $captionData = $ai['caption'] ?? [];
        $pack = CcPack::create([
            'user_id'          => $user->id,
            'client_id'        => $request->client_id,
            'client_name'      => $request->client_name,
            'client_niche'     => $request->client_niche,
            'client_audience'  => $request->client_audience,
            'platform'         => $request->platform,
            'subject'          => $request->subject,
            'tone'             => $request->tone     ?? 'professionnel',
            'language'         => $request->language ?? 'Français',
            'caption'          => $captionData['caption']      ?? null,
            'hashtags'         => $captionData['hashtags']     ?? [],
            'cta'              => $captionData['cta']          ?? null,
            'char_count'       => $captionData['char_count']   ?? null,
            'image_concept'    => $captionData['image_concept']?? null,
            'image_path'       => $imagePath,
            'image_url'        => $imageUrl,
            'script_data'      => $ai['script'] ?? null,
            'pdf_path'         => $pdfPath,
            'pdf_url'          => $pdfUrl,
            'publish_status'   => 'pending', // Approbation obligatoire avant publication
        ]);

        // ── Log succès ────────────────────────────────────
        AgentActivityLog::create([
            'user_id'    => $user->id,
            'client_id'  => $request->client_id,
            'agent_slug' => 'content-creator',
            'agent_name' => 'Agent Créateur de Contenu IA',
            'action'     => 'pack_generated',
            'description'=> "Pack contenu généré — {$request->platform} — {$request->client_name}",
            'status'     => 'success',
            'metadata'   => [
                'pack_id'     => $pack->id,
                'platform'    => $request->platform,
                'has_image'   => !empty($imagePath),
                'has_script'  => !empty($ai['script']),
                'has_pdf'     => !empty($pdfPath),
                'char_count'  => $captionData['char_count'] ?? 0,
            ],
            'completed_at' => now(),
        ]);

        return response()->json([
            'success'   => true,
            'message'   => '✅ Pack de contenu généré — approbation requise avant publication.',
            'pack_id'   => $pack->id,
            'caption'   => $ai['caption'],
            'script'    => $ai['script'],
            'image_url' => $pack->imagePublicUrl(),
            'image_generation_failed' => (bool) ($ai['image_generation_failed'] ?? false),
            'pdf_url'   => $pack->pdfPublicUrl(),
        ], 201);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/content-creator
    // Historique des packs
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $clientId = $request->query('client_id');
        $platform = $request->query('platform');
        $status   = $request->query('status');

        $packs = CcPack::where('user_id', $user->id)
            ->when($clientId, fn($q) => $q->where('client_id', $clientId))
            ->when($platform,  fn($q) => $q->where('platform', $platform))
            ->when($status,    fn($q) => $q->where('publish_status', $status))
            ->with('client:id,name')
            ->orderByDesc('created_at')
            ->take(30)
            ->get()
            ->map(fn($p) => [
                'id'             => $p->id,
                'client_name'    => $p->client_name,
                'client'         => $p->client ? ['id' => $p->client->id, 'name' => $p->client->name] : null,
                'platform'       => $p->platform,
                'subject'        => substr($p->subject, 0, 80),
                'publish_status' => $p->publish_status,
                'image_url'      => $p->imagePublicUrl(),
                'has_script'     => !is_null($p->script_data),
                'has_pdf'        => !is_null($p->pdf_path),
                'char_count'     => $p->char_count,
                'created_at'     => $p->created_at->toIso8601String(),
                'created_ago'    => $p->created_at->diffForHumans(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['packs' => $packs],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/content-creator/{id}
    // ══════════════════════════════════════════════════════════

    public function show(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $pack = CcPack::where('user_id', $user->id)
            ->with(['client:id,name', 'smAccount:id,account_name,platform'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => [
                'pack' => [
                    'id'             => $pack->id,
                    'client_name'    => $pack->client_name,
                    'client_niche'   => $pack->client_niche,
                    'client_audience'=> $pack->client_audience,
                    'platform'       => $pack->platform,
                    'subject'        => $pack->subject,
                    'tone'           => $pack->tone,
                    'language'       => $pack->language,
                    'caption'        => $pack->caption,
                    'hashtags'       => $pack->hashtags,
                    'cta'            => $pack->cta,
                    'char_count'     => $pack->char_count,
                    'image_concept'  => $pack->image_concept,
                    'image_url'      => $pack->imagePublicUrl(),
                    'script_data'    => $pack->script_data,
                    'pdf_url'        => $pack->pdfPublicUrl(),
                    'publish_status' => $pack->publish_status,
                    'platform_post_url'=> $pack->platform_post_url,
                    'published_at'   => $pack->published_at?->toIso8601String(),
                    'created_at'     => $pack->created_at->toIso8601String(),
                ],
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/content-creator/{id}/download/image
    // ══════════════════════════════════════════════════════════

    public function downloadImage(Request $request, int $id)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $pack = CcPack::where('user_id', $user->id)->findOrFail($id);

        if (!$pack->image_path || !Storage::disk('public')->exists($pack->image_path)) {
            return response()->json(['success' => false, 'message' => 'Image non disponible.'], 404);
        }

        return Storage::disk('public')->download(
            $pack->image_path,
            "social_mind_{$pack->client_name}_{$pack->platform}.png"
        );
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/content-creator/{id}/download/pdf
    // ══════════════════════════════════════════════════════════

    public function downloadPdf(Request $request, int $id)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $pack = CcPack::where('user_id', $user->id)->findOrFail($id);

        if (!$pack->pdf_path || !Storage::disk('public')->exists($pack->pdf_path)) {
            return response()->json(['success' => false, 'message' => 'PDF non disponible.'], 404);
        }

        return Storage::disk('public')->download(
            $pack->pdf_path,
            "pack_contenu_{$pack->client_name}_{$pack->platform}.pdf"
        );
    }

    // ══════════════════════════════════════════════════════════
    // DELETE /api/professional/agents/content-creator/{id}
    // ══════════════════════════════════════════════════════════

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $pack = CcPack::where('user_id', $user->id)->findOrFail($id);

        if ($pack->image_path) Storage::disk('public')->delete($pack->image_path);
        if ($pack->pdf_path)   Storage::disk('public')->delete($pack->pdf_path);
        $pack->delete();

        return response()->json(['success' => true, 'message' => 'Pack de contenu supprimé.']);
    }
}
<?php

namespace App\Http\Controllers\Api\Professional\Agents;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessMeetingJob;
use App\Models\AgentActivityLog;
use App\Models\ClientAnalysis;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AccountManagerController extends Controller
{
    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/account-manager/upload
    // Upload fichier + lancement du pipeline IA (queue)
    // ══════════════════════════════════════════════════════════

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file'        => 'required|file|mimes:mp3,wav,mp4,m4a,mov,ogg,webm|max:204800',
            'client_name' => 'required|string|max:100',
            'language'    => 'nullable|in:fr,en,ar',
        ]);

        /** @var \App\Models\User $user */
        $user      = $request->user();
        $file      = $request->file('file');
        $extension = $file->getClientOriginalExtension();
        $sizeMb    = round($file->getSize() / (1024 * 1024), 2);

        // Stockage sécurisé (disk local, non accessible depuis le web)
        $storedPath = $file->storeAs(
            "client_analyses/uploads/{$user->id}",
            uniqid('meeting_') . ".{$extension}",
            'local'
        );

        $analysis = ClientAnalysis::create([
            'user_id'               => $user->id,
            'fichier_original_nom'  => $file->getClientOriginalName(),
            'fichier_original_path' => $storedPath,
            'fichier_type'          => $extension,
            'fichier_taille_mb'     => $sizeMb,
            'client_nom'            => $request->client_name,
            'client_langue'         => $request->language ?? 'fr',
            'statut'                => 'en_attente',
        ]);

        // Log initial
        AgentActivityLog::create([
            'user_id'    => $user->id,
            'agent_slug' => 'account-manager',
            'agent_name' => 'Agent Chef de Compte',
            'action'     => 'meeting_uploaded',
            'description'=> "Réunion uploadée : {$file->getClientOriginalName()} ({$sizeMb} Mo) — client : {$request->client_name}",
            'status'     => 'running',
            'started_at' => now(),
            'metadata'   => [
                'analysis_id' => $analysis->id,
                'fichier_nom' => $file->getClientOriginalName(),
                'taille_mb'   => $sizeMb,
                'language'    => $request->language ?? 'fr',
            ],
        ]);

        // Dispatch du job en arrière-plan (Redis Queue)
        ProcessMeetingJob::dispatch($analysis)->onQueue('default');

        return response()->json([
            'success'     => true,
            'message'     => '✅ Upload réussi ! Pipeline Whisper → Mistral 7B → spaCy → ReportLab lancé en arrière-plan.',
            'analysis_id' => $analysis->id,
            'statut'      => 'en_attente',
            'info'        => 'Interrogez GET /api/professional/agents/account-manager/{id}/status toutes les 10s pour suivre la progression.',
        ], 201);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/account-manager
    // Historique des 20 dernières analyses (filtrable par client)
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $analyses = ClientAnalysis::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->take(20)
            ->get()
            ->map(fn($a) => [
                'id'             => $a->id,
                'client_nom'     => $a->client_nom,
                'fichier_nom'    => $a->fichier_original_nom,
                'fichier_type'   => $a->fichier_type,
                'taille_mb'      => $a->fichier_taille_mb,
                'statut'         => $a->statut,
                'statut_label'   => ClientAnalysis::getStatutLabel($a->statut),
                'statut_progress'=> ClientAnalysis::getStatutProgress($a->statut),
                'is_read'        => $a->is_read,
                'has_pdf'        => $a->hasPdf(),
                'niche'          => $a->profil_client['niche'] ?? null,
                'duree_min'      => $a->transcription_duree
                    ? round($a->transcription_duree / 60, 1) . ' min'
                    : null,
                'mots'           => $a->transcription_mots,
                'created_at'     => $a->created_at?->toIso8601String(),
                'created_ago'    => $a->created_at?->diffForHumans(),
                'erreur'         => $a->erreur_message,
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['analyses' => $analyses],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/account-manager/{id}
    // Détail complet d'une analyse (profil + entités + stratégie)
    // ══════════════════════════════════════════════════════════

    public function show(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $analysis = ClientAnalysis::where('user_id', $user->id)->findOrFail($id);

        if (!$analysis->is_read && $analysis->statut === 'termine') {
            $analysis->update(['is_read' => true]);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'            => $analysis->id,
                'client_nom'    => $analysis->client_nom,
                'fichier_nom'   => $analysis->fichier_original_nom,
                'fichier_type'  => $analysis->fichier_type,
                'statut'        => $analysis->statut,
                'statut_label'  => ClientAnalysis::getStatutLabel($analysis->statut),
                'erreur'        => $analysis->erreur_message,
                'transcription' => [
                    'text'  => $analysis->transcription_text,
                    'mots'  => $analysis->transcription_mots,
                    'duree' => $analysis->transcription_duree,
                ],
                'profil_client' => $analysis->profil_client,
                'entites_ner'   => $analysis->entites_ner,
                'strategie'     => $analysis->strategie,
                'has_pdf'       => $analysis->hasPdf(),
                'created_at'    => $analysis->created_at?->toIso8601String(),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/account-manager/{id}/status
    // Polling du statut pipeline — appelé toutes les 10s depuis React
    // ══════════════════════════════════════════════════════════

    public function status(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $analysis = ClientAnalysis::where('user_id', $user->id)
            ->select(['id', 'statut', 'erreur_message', 'updated_at'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => [
                'id'            => $analysis->id,
                'statut'        => $analysis->statut,
                'statut_label'  => ClientAnalysis::getStatutLabel($analysis->statut),
                'progress'      => ClientAnalysis::getStatutProgress($analysis->statut),
                'is_complete'   => $analysis->statut === 'termine',
                'has_error'     => $analysis->statut === 'erreur',
                'error_message' => $analysis->erreur_message,
                'updated_at'    => $analysis->updated_at?->toIso8601String(),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/account-manager/{id}/pdf
    // Télécharger le PDF stratégie 30 jours (ReportLab)
    // ══════════════════════════════════════════════════════════

    public function downloadPdf(Request $request, int $id)
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $analysis = ClientAnalysis::where('user_id', $user->id)->findOrFail($id);

        if (!$analysis->pdf_path || !Storage::disk('local')->exists($analysis->pdf_path)) {
            return response()->json([
                'success' => false,
                'message' => 'PDF non disponible.',
            ], 404);
        }

        $pdfContent = Storage::disk('local')->get($analysis->pdf_path);
        $clientSlug = str_replace(' ', '_', $analysis->client_nom);
        $filename   = "strategie_{$clientSlug}_{$analysis->id}.pdf";

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Content-Length'      => strlen($pdfContent),
        ]);
    }
}
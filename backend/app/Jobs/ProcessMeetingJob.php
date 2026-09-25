<?php

namespace App\Jobs;

use App\Models\AgentActivityLog;
use App\Models\ClientAnalysis;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessMeetingJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600; // 10 minutes max (Whisper large-v3)
    public int $tries   = 2;

    public function __construct(
        private readonly ClientAnalysis $analysis,
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');

        Log::info("ProcessMeetingJob démarré — analyse #{$this->analysis->id} — client : {$this->analysis->client_nom}");

        try {
            // ── Étape 1 : Whisper ─────────────────────────────
            $this->analysis->update(['statut' => 'transcription']);

            $filePath = Storage::disk('local')->path($this->analysis->fichier_original_path);
            if (!file_exists($filePath)) {
                throw new \Exception("Fichier introuvable : {$filePath}");
            }

            // ── Étape 2 : Extraction profil Mistral 7B ────────
            $this->analysis->update(['statut' => 'extraction']);

            // Appel AI Engine — envoie le fichier + paramètres
            $response = Http::timeout(600)
                ->attach(
                    'file',
                    fopen($filePath, 'r'),
                    $this->analysis->fichier_original_nom
                )
                ->post("{$aiEngineUrl}/account-manager/analyze", [
                    'client_name' => $this->analysis->client_nom,
                    'language'    => $this->analysis->client_langue,
                ]);

            if ($response->failed()) {
                throw new \Exception("AI Engine erreur : " . $response->body());
            }

            $data = $response->json();

            // ── Étape 3 : Sauvegarde PDF ReportLab ───────────
            $this->analysis->update(['statut' => 'pdf']);

            $pdfPath = null;
            if (!empty($data['pdf_base64'])) {
                $pdfContent = base64_decode($data['pdf_base64']);
                $pdfName    = "strategie_{$this->analysis->client_nom}_{$this->analysis->id}.pdf";
                $pdfPath    = "client_analyses/pdfs/{$pdfName}";
                Storage::disk('local')->put($pdfPath, $pdfContent);
            }

            // ── Étape 4 : Mise à jour finale en base ──────────
            $transcription = $data['transcription'] ?? [];
            $this->analysis->update([
                'statut'              => 'termine',
                'transcription_text'  => $transcription['text']      ?? null,
                'transcription_mots'  => $transcription['word_count'] ?? null,
                'transcription_duree' => $transcription['duration']   ?? null,
                'profil_client'       => $data['profil_client']       ?? null,
                'entites_ner'         => $data['entites']             ?? null,
                'strategie'           => $data['strategie']           ?? null,
                'pdf_path'            => $pdfPath,
                'is_read'             => false,
            ]);

            // ── Log activité agent ─────────────────────────────
            AgentActivityLog::create([
                'user_id'    => $this->analysis->user_id,
                'agent_slug' => 'account-manager',
                'agent_name' => 'Agent Chef de Compte',
                'action'     => 'meeting_analyzed',
                'description'=> "Réunion transcrite + stratégie 30j générée pour {$this->analysis->client_nom} ({$transcription['word_count']} mots)",
                'status'     => 'success',
                'metadata'   => [
                    'analysis_id' => $this->analysis->id,
                    'client_nom'  => $this->analysis->client_nom,
                    'mots'        => $transcription['word_count'] ?? 0,
                    'duree_sec'   => $transcription['duration']   ?? 0,
                    'has_pdf'     => !empty($pdfPath),
                    'niche'       => $data['profil_client']['niche'] ?? null,
                ],
                'started_at'   => now()->subMinutes(5),
                'completed_at' => now(),
            ]);

            // ── Notification in-app ────────────────────────────
            $this->analysis->user->notify(
                new \App\Notifications\MeetingAnalyzedNotification($this->analysis)
            );

            Log::info("ProcessMeetingJob terminé ✅ — analyse #{$this->analysis->id}");

        } catch (\Exception $e) {
            Log::error("ProcessMeetingJob erreur #{$this->analysis->id}: " . $e->getMessage());

            $this->analysis->update([
                'statut'         => 'erreur',
                'erreur_message' => $e->getMessage(),
            ]);

            AgentActivityLog::create([
                'user_id'    => $this->analysis->user_id,
                'agent_slug' => 'account-manager',
                'agent_name' => 'Agent Chef de Compte',
                'action'     => 'meeting_analysis_failed',
                'description'=> "Erreur pipeline pour {$this->analysis->client_nom} : " . $e->getMessage(),
                'status'     => 'error',
                'metadata'   => ['analysis_id' => $this->analysis->id],
            ]);
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error("ProcessMeetingJob failed #{$this->analysis->id}: " . $e->getMessage());
        $this->analysis->update([
            'statut'         => 'erreur',
            'erreur_message' => $e->getMessage(),
        ]);
    }
}
<?php

namespace App\Mail;

use App\Models\User;
use App\Models\WeeklyReport;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WeeklyReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly WeeklyReport $report,
        public readonly User         $user,
    ) {}

    public function envelope(): Envelope
    {
        $emoji = $this->report->ai_emoji_semaine ?? '📊';
        $titre = $this->report->ai_titre_semaine ?? 'Votre résumé de la semaine';
        return new Envelope(
            subject: "{$emoji} {$titre} — Social Mind AI"
        );
    }

    public function content(): Content
    {
        return new Content(htmlString: $this->buildEmailHtml());
    }

    private function buildEmailHtml(): string
    {
        $r           = $this->report;
        $userName    = $this->user->first_name ?? $this->user->name ?? 'Utilisateur';
        $emoji       = $r->ai_emoji_semaine ?? '📊';
        $titre       = $r->ai_titre_semaine ?? 'Votre résumé de la semaine';
        $stars       = str_repeat('⭐', $r->score ?? 3) . str_repeat('☆', 5 - ($r->score ?? 3));
        $weekStart   = $r->week_start?->format('d/m/Y') ?? 'N/A';
        $weekEnd     = $r->week_end?->format('d/m/Y')   ?? 'N/A';
        $reach       = number_format($r->total_reach,      0, ',', ' ');
        $engagement  = number_format($r->total_engagement, 0, ',', ' ');
        $followers   = number_format($r->followers_now,    0, ',', ' ');
        $gained      = $r->followers_gained ?? 0;
        $posts       = $r->total_posts ?? 0;
        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        $bilan          = htmlspecialchars($r->ai_bilan           ?? '');
        $topPub         = htmlspecialchars($r->ai_top_publication ?? '');
        $audience       = htmlspecialchars($r->ai_audience        ?? '');
        $recommandation = htmlspecialchars($r->ai_recommandation  ?? '');

        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$titre}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- En-tête gradient -->
    <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);border-radius:16px;
                padding:32px;text-align:center;margin-bottom:20px;">
      <p style="color:#a8c8f0;margin:0 0 8px;font-size:14px;">Social Mind AI</p>
      <div style="font-size:48px;margin-bottom:8px;">{$emoji}</div>
      <h1 style="color:white;margin:0 0 8px;font-size:22px;line-height:1.3;">{$titre}</h1>
      <p style="color:#a8c8f0;margin:0;font-size:14px;">{$weekStart} — {$weekEnd}</p>
      <p style="margin:12px 0 0;font-size:20px;">{$stars}</p>
    </div>

    <!-- Bonjour + bilan -->
    <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;
                box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <p style="margin:0 0 12px;font-size:16px;color:#2c3e50;">
        Bonjour <strong>{$userName}</strong> 👋
      </p>
      <p style="margin:0;font-size:16px;color:#2c3e50;line-height:1.7;">{$bilan}</p>
    </div>

    <!-- 3 métriques -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td width="33%" style="padding:0 6px 0 0;">
          <div style="background:white;border-radius:12px;padding:20px;text-align:center;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="font-size:28px;">👁️</div>
            <div style="font-size:22px;font-weight:bold;color:#0f3460;margin:8px 0 4px;">{$reach}</div>
            <div style="font-size:12px;color:#666;">vues cette semaine</div>
          </div>
        </td>
        <td width="33%" style="padding:0 3px;">
          <div style="background:white;border-radius:12px;padding:20px;text-align:center;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="font-size:28px;">❤️</div>
            <div style="font-size:22px;font-weight:bold;color:#e74c3c;margin:8px 0 4px;">{$engagement}</div>
            <div style="font-size:12px;color:#666;">interactions totales</div>
          </div>
        </td>
        <td width="33%" style="padding:0 0 0 6px;">
          <div style="background:white;border-radius:12px;padding:20px;text-align:center;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="font-size:28px;">👥</div>
            <div style="font-size:22px;font-weight:bold;color:#27ae60;margin:8px 0 4px;">{$followers}</div>
            <div style="font-size:12px;color:#666;">abonnés (+{$gained} cette sem.)</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Meilleure publication -->
    <div style="background:#fff8e1;border-radius:12px;padding:20px;margin-bottom:16px;
                border-left:4px solid #f39c12;">
      <h3 style="margin:0 0 10px;color:#e67e22;font-size:16px;">🏆 Votre meilleure publication</h3>
      <p style="margin:0;color:#2c3e50;line-height:1.7;font-size:15px;">{$topPub}</p>
    </div>

    <!-- Audience -->
    <div style="background:#e8f5e9;border-radius:12px;padding:20px;margin-bottom:16px;
                border-left:4px solid #27ae60;">
      <h3 style="margin:0 0 10px;color:#27ae60;font-size:16px;">👥 Votre audience</h3>
      <p style="margin:0;color:#2c3e50;line-height:1.7;font-size:15px;">{$audience}</p>
    </div>

    <!-- Recommandation -->
    <div style="background:#e3f2fd;border-radius:12px;padding:20px;margin-bottom:20px;
                border-left:4px solid #3498db;">
      <h3 style="margin:0 0 10px;color:#3498db;font-size:16px;">💡 Mon conseil pour cette semaine</h3>
      <p style="margin:0;color:#2c3e50;line-height:1.7;font-size:15px;font-weight:500;">
        {$recommandation}
      </p>
    </div>

    <!-- Publications -->
    <p style="text-align:center;color:#888;font-size:14px;margin-bottom:20px;">
      📝 Vous avez publié <strong>{$posts} fois</strong> cette semaine
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="{$frontendUrl}/dashboard/reports"
         style="background:linear-gradient(135deg,#0f3460,#6a1b9a);color:white;
                text-decoration:none;padding:14px 32px;border-radius:50px;
                font-size:15px;font-weight:bold;display:inline-block;">
        📊 Voir le rapport complet avec graphiques →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#aaa;font-size:12px;padding-top:16px;border-top:1px solid #eee;">
      <p style="margin:0 0 4px;">Social Mind AI — Votre assistant marketing personnel</p>
      <p style="margin:0;">Ce résumé est envoyé automatiquement chaque lundi matin à 8h.</p>
    </div>
  </div>
</body>
</html>
HTML;
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentActivityLog extends Model
{
    protected $fillable = [
        'user_id', 'client_id', 'agent_slug', 'agent_name',
        'action', 'description', 'metadata',
        'status', 'error_message', 'started_at', 'completed_at',
    ];

    protected $casts = [
        'metadata'     => 'array',
        'started_at'   => 'datetime',
        'completed_at' => 'datetime',
    ];

    // ── Noms et icônes des agents (depuis les .md) ────────────
    public static array $AGENTS = [
        'account-manager'   => ['name' => 'Agent Chef de Compte',              'icon' => '🎯', 'color' => 'indigo'],
        'social-manager'    => ['name' => 'Agent Gestionnaire de RS',           'icon' => '📱', 'color' => 'blue'],
        'content-strategy'  => ['name' => 'Agent Stratège de Contenu',          'icon' => '📊', 'color' => 'purple'],
        'content-creator'   => ['name' => 'Agent Créateur de Contenu IA',       'icon' => '✨', 'color' => 'pink'],
        'analytics'         => ['name' => 'Agent Analytics IA',                 'icon' => '📈', 'color' => 'green'],
        'ad-optimizer'      => ['name' => 'Agent Optimisation Publicitaire',    'icon' => '💰', 'color' => 'amber'],
        'competitive-intel' => ['name' => 'Agent Veille Concurrentielle',       'icon' => '🔍', 'color' => 'red'],
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function getAgentInfo(): array
    {
        return self::$AGENTS[$this->agent_slug] ?? ['name' => $this->agent_name, 'icon' => '🤖', 'color' => 'gray'];
    }
}
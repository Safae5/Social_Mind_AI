<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'name', 'company_name', 'email', 'phone',
        'website', 'country', 'city', 'industry', 'niche',
        'contract_type', 'contract_start', 'contract_end',
        'monthly_retainer', 'project_budget', 'currency',
        'services', 'platforms', 'assigned_team', 'assigned_agents',
        'status', 'notes', 'avatar', 'target_kpis',
    ];

    protected $casts = [
        'services'        => 'array',
        'platforms'       => 'array',
        'assigned_team'   => 'array',
        'assigned_agents' => 'array',
        'target_kpis'     => 'array',
        'contract_start'  => 'date',
        'contract_end'    => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function workspace(): HasOne
    {
        return $this->hasOne(ClientWorkspace::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(InvoicesforClient::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(AgentActivityLog::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
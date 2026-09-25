<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfessionalProfile extends Model
{
    protected $fillable = [
        'user_id', 'agency_name', 'professional_phone', 'website',
        'founded_year', 'activity_type', 'team_size',
        'current_clients_count', 'avg_simultaneous_clients',
        'active_projects', 'years_experience',
        'expertise_domains', 'platforms_mastered', 'tools_used',
        'certifications', 'avg_monthly_ad_budget', 'campaigns_managed_count',
        'niches', 'niche_details',
        'avg_roas', 'avg_engagement_rate', 'avg_follower_growth',
        'total_campaigns_done', 'monthly_ad_budget_managed',
        'client_retention_rate', 'satisfied_clients_count',
        'successful_projects_count',
        'services', 'agents_config', 'objectives',
        'target_clients', 'target_revenue',
        'onboarding_completed', 'onboarding_completed_at', 'onboarding_step',
        'marketplace_active', 'profile_completeness',
    ];

    protected $casts = [
        'expertise_domains'     => 'array',
        'platforms_mastered'    => 'array',
        'tools_used'            => 'array',
        'certifications'        => 'array',
        'niches'                => 'array',
        'niche_details'         => 'array',
        'services'              => 'array',
        'agents_config'         => 'array',
        'objectives'            => 'array',
        'onboarding_completed'  => 'boolean',
        'marketplace_active'    => 'boolean',
        'onboarding_completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function calculateCompleteness(): float
    {
        $fields = [
            'agency_name', 'professional_phone', 'website',
            'activity_type', 'years_experience',
            'expertise_domains', 'niches', 'services',
        ];
        $filled  = array_filter($fields, fn($f) => !empty($this->$f));
        return round((count($filled) / count($fields)) * 100, 1);
    }
}
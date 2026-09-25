<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'first_name'         => $this->first_name,
            'last_name'          => $this->last_name,
            'full_name'          => $this->full_name,
            'email'              => $this->email,
            'phone'              => $this->phone,
            'avatar_url'         => $this->avatar_url,
            'role'               => $this->role,
            'status'             => $this->status,
            'email_verified'     => $this->isEmailVerified(),
            'two_factor_enabled' => $this->two_factor_enabled,
            'current_plan'       => $this->current_plan,
            'is_on_trial'        => $this->isOnTrial(),
            'trial_ends_at'      => $this->trial_ends_at?->toIso8601String(),
            'dashboard_path'     => $this->getDashboardPath(),
            'locale'             => $this->locale,
            'timezone'           => $this->timezone,
            'last_login_at'      => $this->last_login_at?->toIso8601String(),
            'created_at'         => $this->created_at->toIso8601String(),

            // Abonnement actif
            'subscription'       => $this->whenLoaded('activeSubscription', function () {
                $sub = $this->activeSubscription;
                if (!$sub) return null;
                return [
                    'status'        => $sub->status,
                    'plan_slug'     => $sub->plan?->slug,
                    'plan_name'     => $sub->plan?->name,
                    'ends_at'       => $sub->ends_at?->toIso8601String(),
                    'days_remaining'=> $sub->daysRemaining(),
                ];
            }),
        ];
    }
}
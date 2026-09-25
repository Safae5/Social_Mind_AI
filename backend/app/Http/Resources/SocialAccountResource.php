<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SocialAccountResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->id,
            'platform'          => $this->platform,
            // Compte Instagram connecté sans Page Facebook liée (Instagram
            // API with Instagram Login) — le frontend en a besoin pour
            // router la déconnexion vers le bon endpoint, /platform seul ne
            // distingue pas les deux flux.
            'is_instagram_direct' => $this->isInstagramDirectLogin(),
            'platform_user_id'  => $this->platform_user_id,
            'username'          => $this->platform_username,
            'display_name'      => $this->platform_display_name,
            'avatar_url'        => $this->platform_avatar_url,
            'page_name'         => $this->page_name,
            'followers_count'   => $this->followers_count,
            'following_count'   => $this->following_count,
            'posts_count'       => $this->posts_count,
            'account_type'      => $this->account_type,
            'is_active'         => $this->is_active,
            'token_valid'       => $this->token_valid,
            'token_expires_at'  => $this->token_expires_at?->toIso8601String(),
            'token_expiring_soon' => $this->isTokenExpiringSoon(48),
            'last_synced_at'    => $this->last_synced_at?->toIso8601String(),
            'has_optimal_slots' => $this->optimalSlots()->valid()->exists(),
            'created_at'        => $this->created_at->toIso8601String(),
        ];
    }
}
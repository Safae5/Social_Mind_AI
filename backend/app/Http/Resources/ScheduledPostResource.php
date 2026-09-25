<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ScheduledPostResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'               => $this->id,
            'caption'          => $this->caption,
            'hashtags'         => $this->hashtags ?? [],
            'media_url'        => $this->media_url,
            'media_type'       => $this->media_type,
            'scheduled_at'     => $this->scheduled_at->toIso8601String(),
            'published_at'     => $this->published_at?->toIso8601String(),
            'status'           => $this->status,
            'ai_optimized'     => $this->ai_optimized_time,
            'slot_score'       => $this->slot_score,
            'platform_post_url'=> $this->platform_post_url,
            'failure_reason'   => $this->failure_reason,
            'retry_count'      => $this->retry_count,
            'created_by_agent' => $this->created_by_agent,
            'social_account'   => $this->whenLoaded('socialAccount', fn () => [
                'id'        => $this->socialAccount->id,
                'platform'  => $this->socialAccount->platform,
                'username'  => $this->socialAccount->platform_username,
                'avatar'    => $this->socialAccount->platform_avatar_url,
            ]),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
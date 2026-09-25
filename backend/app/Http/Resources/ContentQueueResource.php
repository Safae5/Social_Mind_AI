<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ContentQueueResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'               => $this->id,
            'caption'          => $this->caption,
            'hashtags'         => $this->hashtags ?? [],
            'media_url'        => $this->media_url,
            'media_type'       => $this->media_type,
            'source'           => $this->source,
            'status'           => $this->status,
            'queue_position'   => $this->queue_position,
            'full_caption'     => $this->full_caption,
            'social_account'   => $this->whenLoaded('socialAccount', fn () => [
                'id'       => $this->socialAccount->id,
                'platform' => $this->socialAccount->platform,
                'username' => $this->socialAccount->platform_username,
                'avatar'   => $this->socialAccount->platform_avatar_url,
            ]),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
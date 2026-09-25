<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class GeneratedContentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                       => $this->id,
            'subject'                  => $this->subject,
            'platform'                 => $this->platform,
            'tone'                     => $this->tone,
            'language'                 => $this->language,
            'variants'                 => $this->variants ?? [],
            'image_url'                => $this->getImagePublicUrl(),
            'video_url'                => $this->getVideoPublicUrl(),
            'brand_voice_dominant_tone'=> $this->brand_voice_dominant_tone,
            'brand_voice_n_examples'   => $this->brand_voice_n_examples,
            'selected_variant'         => $this->selected_variant,
            'publish_status'           => $this->publish_status,
            'platform_post_id'         => $this->platform_post_id,
            'platform_post_url'        => $this->platform_post_url,
            'published_at'             => $this->published_at?->toIso8601String(),
            'publish_error'            => $this->publish_error,
            'social_account'           => $this->whenLoaded('socialAccount', fn() => [
                'id'       => $this->socialAccount->id,
                'platform' => $this->socialAccount->platform,
                'username' => $this->socialAccount->platform_username,
            ]),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
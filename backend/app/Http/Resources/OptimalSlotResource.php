<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class OptimalSlotResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'              => $this->id,
            'day_of_week'     => $this->day_of_week,
            'day_name'        => $this->day_name,
            'hour'            => $this->hour,
            'time'            => $this->time,
            'platform'        => $this->platform,
            'engagement_score'=> $this->engagement_score,
            'composite_score' => $this->composite_score,
            'rank'            => $this->rank,
            'posts_analyzed'  => $this->posts_analyzed,
            'data_source'     => $this->data_source,
            'next_occurrence' => $this->getNextOccurrence()?->toIso8601String(),
            'analyzed_at'     => $this->analyzed_at?->toIso8601String(),
            'expires_at'      => $this->expires_at?->toIso8601String(),
            'social_account'  => $this->whenLoaded('socialAccount', fn () => [
                'id'       => $this->socialAccount->id,
                'platform' => $this->socialAccount->platform,
                'username' => $this->socialAccount->platform_username,
            ]),
        ];
    }
}
<?php

namespace App\Events;

use App\Models\ScheduledPost;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ScheduledPostPublished
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly ScheduledPost $post,
        public readonly array         $publishResult,
    ) {}
}
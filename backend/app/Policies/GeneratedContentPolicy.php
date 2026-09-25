<?php

namespace App\Policies;

use App\Models\GeneratedContent;
use App\Models\User;

class GeneratedContentPolicy
{
    public function view(User $user, GeneratedContent $content): bool
    {
        return $user->id === $content->user_id;
    }

    public function publish(User $user, GeneratedContent $content): bool
    {
        return $user->id === $content->user_id
            && in_array($content->publish_status, ['draft', 'approved', 'failed']);
    }

    public function download(User $user, GeneratedContent $content): bool
    {
        return $user->id === $content->user_id;
    }
}
<?php

namespace App\Policies;

use App\Models\ScheduledPost;
use App\Models\User;

class ScheduledPostPolicy
{
    public function view(User $user, ScheduledPost $post): bool
    {
        return $user->id === $post->user_id;
    }

    public function cancel(User $user, ScheduledPost $post): bool
    {
        return $user->id === $post->user_id && $post->status === 'pending';
    }
}
<?php

namespace App\Events;

use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SocialAccountConnected
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly User          $user,
        public readonly SocialAccount $account,
    ) {}
}
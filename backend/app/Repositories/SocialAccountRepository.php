<?php

namespace App\Repositories;

use App\Models\SocialAccount;
use App\Models\User;

class SocialAccountRepository
{
    public function findActive(int $userId): \Illuminate\Database\Eloquent\Collection
    {
        return SocialAccount::where('user_id', $userId)
            ->active()
            ->orderBy('platform')
            ->get();
    }

    public function findByPlatform(int $userId, string $platform): ?SocialAccount
    {
        return SocialAccount::where('user_id', $userId)
            ->where('platform', $platform)
            ->active()
            ->first();
    }

    public function countActive(int $userId): int
    {
        return SocialAccount::where('user_id', $userId)->active()->count();
    }

    public function findNeedingSync(): \Illuminate\Database\Eloquent\Collection
    {
        return SocialAccount::active()->needsSync()->get();
    }

    public function findExpiringSoon(): \Illuminate\Database\Eloquent\Collection
    {
        return SocialAccount::where('token_valid', true)
            ->where('token_expires_at', '<=', now()->addHours(24))
            ->get();
    }

    public function deactivate(SocialAccount $account): void
    {
        $account->update(['is_active' => false]);
    }

    public function disconnect(SocialAccount $account): void
    {
        $account->delete(); // SoftDelete
    }
}
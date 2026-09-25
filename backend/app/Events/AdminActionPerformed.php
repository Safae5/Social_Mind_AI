<?php

namespace App\Events;

use App\Models\User;

class AdminActionPerformed
{
    public function __construct(
        public readonly User $admin,
        public readonly string $action,
        public readonly ?string $targetType = null,
        public readonly ?int $targetId = null,
        public readonly ?array $before = null,
        public readonly ?array $after = null,
        public readonly ?string $ipAddress = null,
    ) {}
}

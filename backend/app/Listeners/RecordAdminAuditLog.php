<?php

namespace App\Listeners;

use App\Events\AdminActionPerformed;
use App\Models\AdminAuditLog;

class RecordAdminAuditLog
{
    // Clés jamais persistées, quelle que soit la profondeur — casse insensible.
    private const SECRET_KEY_PATTERNS = [
        'password', 'token', 'secret', 'api_key', 'apikey',
        'access_token', 'refresh_token', 'stripe_secret',
    ];

    public function handle(AdminActionPerformed $event): void
    {
        AdminAuditLog::create([
            'admin_id'    => $event->admin->id,
            'action'      => $event->action,
            'target_type' => $event->targetType,
            'target_id'   => $event->targetId,
            'before'      => $this->sanitize($event->before),
            'after'       => $this->sanitize($event->after),
            'ip_address'  => $event->ipAddress,
            'created_at'  => now(),
        ]);
    }

    private function sanitize(?array $data): ?array
    {
        if ($data === null) {
            return null;
        }

        $clean = [];
        foreach ($data as $key => $value) {
            if ($this->isSecretKey((string) $key)) {
                continue;
            }
            $clean[$key] = is_array($value) ? $this->sanitize($value) : $value;
        }

        return $clean;
    }

    private function isSecretKey(string $key): bool
    {
        $key = strtolower($key);
        foreach (self::SECRET_KEY_PATTERNS as $pattern) {
            if (str_contains($key, $pattern)) {
                return true;
            }
        }
        return false;
    }
}

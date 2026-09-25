<?php

namespace App\Services\Admin;

use App\Events\AdminActionPerformed;
use App\Models\User;
use Illuminate\Http\Request;

class AdminAuditLogService
{
    // ── Enregistre une action admin sensible ───────────────────────
    // Ne jamais passer de mots de passe / tokens / secrets dans $before/$after —
    // le listener les filtre par sécurité, mais l'appelant ne doit pas en dépendre.
    public function log(
        User $admin,
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        ?array $before = null,
        ?array $after = null,
        ?Request $request = null,
    ): void {
        event(new AdminActionPerformed(
            admin:     $admin,
            action:    $action,
            targetType: $targetType,
            targetId:   $targetId,
            before:     $before,
            after:      $after,
            ipAddress:  $request?->ip(),
        ));
    }
}

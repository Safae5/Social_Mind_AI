<?php

namespace App\Services\Admin;

use App\Jobs\ProcessGdprDeletionJob;
use App\Models\GdprRequest;
use App\Models\TwoFactorSession;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Auth\PasswordResetService;
use Illuminate\Http\Request;

class UserManagementService
{
    public function __construct(
        private readonly AdminAuditLogService $auditLog,
        private readonly PasswordResetService $passwordResetService,
    ) {}

    // ══════════════════════════════════════════════════════════
    // Changement de rôle
    // ══════════════════════════════════════════════════════════

    public function changeRole(User $admin, User $target, string $newRole, Request $request): User
    {
        $this->guardSelfAction($admin, $target, 'changer votre propre rôle');

        if ($target->role === 'admin' && $newRole !== 'admin') {
            $this->assertNotLastAdmin($target);
        }

        $before = ['role' => $target->role];
        $target->update(['role' => $newRole]);

        $this->auditLog->log(
            admin: $admin,
            action: 'user.role_changed',
            targetType: 'User',
            targetId: $target->id,
            before: $before,
            after: ['role' => $newRole],
            request: $request,
        );

        return $target->fresh();
    }

    // ══════════════════════════════════════════════════════════
    // Suspension / réactivation / bannissement
    // ══════════════════════════════════════════════════════════

    public function suspend(User $admin, User $target, ?string $reason, Request $request): User
    {
        $this->guardSelfAction($admin, $target, 'suspendre votre propre compte');
        $this->assertNotLastAdmin($target);

        $before = ['status' => $target->status];
        $target->update(['status' => 'suspended']);
        $this->revokeAllSessions($target);

        $this->auditLog->log(
            admin: $admin,
            action: 'user.suspended',
            targetType: 'User',
            targetId: $target->id,
            before: $before,
            after: ['status' => 'suspended', 'reason' => $reason],
            request: $request,
        );

        return $target->fresh();
    }

    public function unsuspend(User $admin, User $target, Request $request): User
    {
        $before = ['status' => $target->status];
        $target->update(['status' => 'active']);

        $this->auditLog->log(
            admin: $admin,
            action: 'user.unsuspended',
            targetType: 'User',
            targetId: $target->id,
            before: $before,
            after: ['status' => 'active'],
            request: $request,
        );

        return $target->fresh();
    }

    public function ban(User $admin, User $target, string $reason, Request $request): User
    {
        $this->guardSelfAction($admin, $target, 'bannir votre propre compte');
        $this->assertNotLastAdmin($target);

        $before = ['status' => $target->status];
        $target->update(['status' => 'banned']);
        $this->revokeAllSessions($target);

        $this->auditLog->log(
            admin: $admin,
            action: 'user.banned',
            targetType: 'User',
            targetId: $target->id,
            before: $before,
            after: ['status' => 'banned', 'reason' => $reason],
            request: $request,
        );

        return $target->fresh();
    }

    // ══════════════════════════════════════════════════════════
    // Réinitialisation de mot de passe (déclenchée par un admin)
    // ══════════════════════════════════════════════════════════

    public function triggerPasswordReset(User $admin, User $target, Request $request): void
    {
        $this->passwordResetService->sendResetLink($target->email);

        $this->auditLog->log(
            admin: $admin,
            action: 'user.password_reset_triggered',
            targetType: 'User',
            targetId: $target->id,
            request: $request,
        );
    }

    // ══════════════════════════════════════════════════════════
    // RGPD — droit à l'effacement (anonymisation, voir ProcessGdprDeletionJob)
    // ══════════════════════════════════════════════════════════

    public function requestGdprDeletion(User $admin, User $target, Request $request): GdprRequest
    {
        $this->guardSelfAction($admin, $target, 'supprimer votre propre compte');
        $this->assertNotLastAdmin($target);

        $gdprRequest = GdprRequest::create([
            'user_id'      => $target->id,
            'type'         => 'deletion',
            'status'       => 'pending',
            'requested_by' => $admin->id,
            'requested_at' => now(),
        ]);

        $this->auditLog->log(
            admin: $admin,
            action: 'user.gdpr_deletion_requested',
            targetType: 'User',
            targetId: $target->id,
            after: ['gdpr_request_id' => $gdprRequest->id],
            request: $request,
        );

        ProcessGdprDeletionJob::dispatch($gdprRequest);

        return $gdprRequest;
    }

    // ══════════════════════════════════════════════════════════
    // Garde-fous
    // ══════════════════════════════════════════════════════════

    private function guardSelfAction(User $admin, User $target, string $actionLabel): void
    {
        if ($admin->id === $target->id) {
            throw new \Exception("Action impossible : vous ne pouvez pas {$actionLabel}.", 400);
        }
    }

    private function assertNotLastAdmin(User $target): void
    {
        if ($target->role !== 'admin') {
            return;
        }

        $remainingAdmins = User::where('role', 'admin')
            ->where('id', '!=', $target->id)
            ->where('status', 'active')
            ->count();

        if ($remainingAdmins === 0) {
            throw new \Exception(
                'Action refusée : impossible de retirer le dernier administrateur actif de la plateforme.',
                400
            );
        }
    }

    private function revokeAllSessions(User $target): void
    {
        UserSession::where('user_id', $target->id)->delete();
        TwoFactorSession::where('user_id', $target->id)->delete();
        $target->tokens()->delete(); // Sanctum refresh tokens
    }
}

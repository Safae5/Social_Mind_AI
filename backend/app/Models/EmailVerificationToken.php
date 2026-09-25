<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EmailVerificationToken extends Model
{
    protected $fillable = [
        'user_id',
        'token',
        'expires_at',
        'used',
        'used_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at'    => 'datetime',
        'used'       => 'boolean',
    ];

    // ── Génère un token sécurisé ──────────────────────────────────
    public static function generateFor(User $user): self
    {
        // Supprime les anciens tokens de cet utilisateur
        self::where('user_id', $user->id)->delete();

        return self::create([
            'user_id'    => $user->id,
            'token'      => Str::random(64),
            'expires_at' => now()->addHours(24),
        ]);
    }

    public function isExpired(): bool  { return $this->expires_at->isPast(); }
    public function isUsed(): bool     { return $this->used; }
    public function isValid(): bool    { return !$this->isExpired() && !$this->isUsed(); }

    public function markAsUsed(): void
    {
        $this->update(['used' => true, 'used_at' => now()]);
    }

    // ── Relation ──────────────────────────────────────────────────
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
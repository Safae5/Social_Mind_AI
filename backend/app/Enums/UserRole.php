<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN    = 'admin';
    case BUSINESS = 'business';
    case STANDARD = 'standard';

    public function label(): string
    {
        return match($this) {
            self::ADMIN    => 'Administrateur',
            self::BUSINESS => 'Professionnel',
            self::STANDARD => 'Utilisateur Standard',
        };
    }

    public function dashboardPath(): string
    {
        return match($this) {
            self::ADMIN    => '/admin',
            self::BUSINESS => '/business',
            self::STANDARD => '/dashboard',
        };
    }
}
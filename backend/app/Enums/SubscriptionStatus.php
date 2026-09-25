<?php

namespace App\Enums;

enum SubscriptionStatus: string
{
    case ACTIVE      = 'active';
    case TRIALING    = 'trialing';
    case PAST_DUE    = 'past_due';
    case CANCELED    = 'canceled';
    case INCOMPLETE  = 'incomplete';

    public function isValid(): bool
    {
        return in_array($this, [self::ACTIVE, self::TRIALING]);
    }
}
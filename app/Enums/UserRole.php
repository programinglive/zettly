<?php

namespace App\Enums;

enum UserRole: string
{
    case USER = 'user';
    case SUPER_ADMIN = 'super_admin';

    public function label(): string
    {
        return match ($this) {
            self::USER => 'User',
            self::SUPER_ADMIN => 'Super Administrator',
        };
    }
}

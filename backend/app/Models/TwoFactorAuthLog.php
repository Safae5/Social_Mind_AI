<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TwoFactorAuthLog extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'success',
        'ip_address',
        'user_agent',
    ];
}

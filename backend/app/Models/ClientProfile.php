<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClientProfile extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'company_name', 'contact_name',
        'contact_email', 'contact_phone', 'website', 'logo',
        'niche', 'target_audience', 'goals', 'competitors',
        'platforms', 'brand_tone', 'current_strategy',
        'strategy_start_date', 'strategy_end_date',
        'monthly_retainer', 'stripe_connect_customer_id',
        'status', 'last_meeting_transcript', 'last_meeting_at',
    ];

    protected $casts = [
        'goals'               => 'array',
        'competitors'         => 'array',
        'platforms'           => 'array',
        'strategy_start_date' => 'date',
        'strategy_end_date'   => 'date',
        'last_meeting_at'     => 'datetime',
        'monthly_retainer'    => 'decimal:2',
    ];

    public function user()               { return $this->belongsTo(User::class); }
    public function socialMediaAccounts(){ return $this->hasMany(SocialMediaAccount::class); }
    public function scheduledPosts()     { return $this->hasMany(ScheduledPost::class); }
    public function contentCalendars()   { return $this->hasMany(ContentCalendar::class); }
}
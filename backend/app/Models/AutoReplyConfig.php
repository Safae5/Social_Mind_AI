<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AutoReplyConfig extends Model
{
    protected $fillable = [
        'user_id', 'social_account_id',
        'auto_reply_positive', 'auto_reply_questions',
        'auto_hide_spam', 'auto_flag_negative',
        'brand_examples', 'brand_name',
        'notify_negative', 'notify_new_dm',
    ];

    protected $casts = [
        'brand_examples'       => 'array',
        'auto_reply_positive'  => 'boolean',
        'auto_reply_questions' => 'boolean',
        'auto_hide_spam'       => 'boolean',
        'auto_flag_negative'   => 'boolean',
        'notify_negative'      => 'boolean',
        'notify_new_dm'        => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function socialAccount(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class);
    }

    public function getValidBrandExamples(): array
    {
        return array_filter($this->brand_examples ?? [], fn($e) => !empty(trim($e)));
    }
}
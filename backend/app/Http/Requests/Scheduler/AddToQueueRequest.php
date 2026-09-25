<?php

namespace App\Http\Requests\Scheduler;

use Illuminate\Foundation\Http\FormRequest;

class AddToQueueRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'social_account_id' => 'required|integer|exists:social_accounts,id',
            'caption'           => 'required|string|max:2200',
            'hashtags'          => 'nullable|array|max:30',
            'hashtags.*'        => 'string|starts_with:#|max:100',
            'media_url'         => 'nullable|url|max:2048',
            'media_type'        => 'required|in:image,video,carousel,reel,story,text',
            'source'            => 'nullable|in:manual,ai_generated,calendar',
        ];
    }
}
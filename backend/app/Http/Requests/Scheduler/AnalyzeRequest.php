<?php

namespace App\Http\Requests\Scheduler;

use Illuminate\Foundation\Http\FormRequest;

class AnalyzeRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'account_id' => 'required|integer|exists:social_accounts,id',
            'async'      => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'account_id.required' => 'Sélectionnez un compte social.',
            'account_id.exists'   => 'Ce compte n\'existe pas.',
        ];
    }
}
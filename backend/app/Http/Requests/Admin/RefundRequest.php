<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class RefundRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'amount'  => ['nullable', 'numeric', 'min:0.01'], // null = remboursement total
            'confirm' => ['required', 'accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'confirm.required' => 'Confirmation explicite requise.',
            'confirm.accepted' => 'Confirmation explicite requise.',
        ];
    }
}

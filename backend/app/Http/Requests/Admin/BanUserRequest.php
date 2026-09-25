<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class BanUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'reason'  => ['required', 'string', 'max:500'],
            'confirm' => ['required', 'accepted'], // le front doit envoyer confirm: true
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required'  => 'Un motif est obligatoire pour un bannissement.',
            'confirm.required' => 'Confirmation explicite requise.',
            'confirm.accepted' => 'Confirmation explicite requise.',
        ];
    }
}

<?php

namespace App\Http\Requests\Content;

use Illuminate\Foundation\Http\FormRequest;

class PublishContentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'selected_variant'  => 'required|integer|in:1,2,3',
            'social_account_id' => 'required|integer|exists:social_accounts,id',
        ];
    }

    public function messages(): array
    {
        return [
            'selected_variant.required'  => 'Sélectionnez une variante de légende.',
            'selected_variant.in'        => 'Variante invalide (1, 2 ou 3).',
            'social_account_id.required' => 'Sélectionnez un compte social.',
            'social_account_id.exists'   => 'Compte social introuvable.',
        ];
    }
}
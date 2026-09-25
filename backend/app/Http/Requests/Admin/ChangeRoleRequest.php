<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ChangeRoleRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'role' => ['required', 'string', 'in:standard,business,admin'],
        ];
    }

    public function messages(): array
    {
        return [
            'role.in' => 'Rôle invalide.',
        ];
    }
}

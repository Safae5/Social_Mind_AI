<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ChangePlanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'plan_slug'     => ['required', 'string', 'exists:plans,slug'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
        ];
    }
}

<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CreatePlanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:100'],
            'slug'          => ['required', 'string', 'max:100', 'alpha_dash', 'unique:plans,slug'],
            'description'   => ['nullable', 'string', 'max:500'],
            'type'          => ['required', 'in:standard,business'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_yearly'  => ['required', 'numeric', 'min:0'],
            'currency'      => ['nullable', 'string', 'size:3'],
            'features'      => ['nullable', 'array'],
            'features.*'    => ['string'],
            'limits'        => ['nullable', 'array'],
            'has_trial'     => ['nullable', 'boolean'],
            'trial_days'    => ['nullable', 'integer', 'min:0'],
            'is_featured'   => ['nullable', 'boolean'],
            'sort_order'    => ['nullable', 'integer'],
            'color'         => ['nullable', 'string', 'max:20'],
        ];
    }
}

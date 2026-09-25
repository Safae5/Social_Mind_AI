<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'          => ['sometimes', 'string', 'max:100'],
            'description'   => ['nullable', 'string', 'max:500'],
            'price_monthly' => ['sometimes', 'numeric', 'min:0'],
            'price_yearly'  => ['sometimes', 'numeric', 'min:0'],
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

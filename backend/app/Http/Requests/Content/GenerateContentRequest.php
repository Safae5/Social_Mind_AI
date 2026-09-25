<?php

namespace App\Http\Requests\Content;

use Illuminate\Foundation\Http\FormRequest;

class GenerateContentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'subject'           => 'required|string|max:500',
            'platform'          => 'required|in:instagram,tiktok,facebook,linkedin,twitter',
            'tone'              => 'required|string|in:decontracte,professionnel,inspirant,educatif,humoristique,premium,urgent,communautaire',
            'language'          => 'nullable|string|max:50',
            'extra_context'     => 'nullable|string|max:1000',
            'brand_example_1'   => 'nullable|string|max:2200',
            'brand_example_2'   => 'nullable|string|max:2200',
            'brand_example_3'   => 'nullable|string|max:2200',
            'generate_image'    => 'boolean',
            'generate_video'    => 'boolean',
            'social_account_id' => 'nullable|integer|exists:social_accounts,id',
        ];
    }

    public function messages(): array
    {
        return [
            'subject.required'  => 'Le sujet est obligatoire.',
            'platform.required' => 'Sélectionnez une plateforme.',
            'platform.in'       => 'Plateforme non supportée.',
            'tone.required'     => 'Sélectionnez un ton.',
            'tone.in'           => 'Ton non supporté.',
        ];
    }

    /**
     * Retourne les exemples brand voice filtrés.
     */
    public function getBrandExamples(): array
    {
        return array_values(array_filter([
            $this->brand_example_1 ?? '',
            $this->brand_example_2 ?? '',
            $this->brand_example_3 ?? '',
        ]));
    }
}
<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'min:2', 'max:50'],
            'last_name'  => ['required', 'string', 'min:2', 'max:50'],
            'email'      => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'password'   => ['required', 'string', 'min:8', 'confirmed'],
            'role'       => ['required', 'string', 'in:standard,business'],
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required' => 'Le prénom est obligatoire.',
            'first_name.min'      => 'Le prénom doit avoir au moins 2 caractères.',
            'last_name.required'  => 'Le nom est obligatoire.',
            'last_name.min'       => 'Le nom doit avoir au moins 2 caractères.',
            'email.required'      => 'L\'adresse e-mail est obligatoire.',
            'email.email'         => 'L\'adresse e-mail n\'est pas valide.',
            'email.unique'        => 'Cet e-mail est déjà utilisé.',
            'password.required'   => 'Le mot de passe est obligatoire.',
            'password.min'        => 'Le mot de passe doit avoir au moins 8 caractères.',
            'password.confirmed'  => 'Les mots de passe ne correspondent pas.',
            'role.required'       => 'Le type de compte est obligatoire.',
            'role.in'             => 'Le type de compte doit être standard ou business.',
        ];
    }
}
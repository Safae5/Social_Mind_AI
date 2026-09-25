<?php

namespace App\Http\Requests\Scheduler;

use Illuminate\Foundation\Http\FormRequest;

class SchedulePostRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'content_queue_id'  => 'required|integer|exists:content_queue,id',
            'scheduled_at'      => 'required|date|after:now',
            'optimal_slot_id'   => 'nullable|integer|exists:optimal_slots,id',
        ];
    }

    public function messages(): array
    {
        return [
            'scheduled_at.after' => 'La date de publication doit être dans le futur.',
        ];
    }
}
<?php

namespace App\Http\Requests;

use App\Models\Permission;
use App\Models\RestaurantTable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && (
            $user->can(Permission::CAN_MANAGE_TABLES)
            || $user->can(Permission::CAN_MANAGE_PERMISSIONS)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'capacity' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:50'],
            'status' => ['sometimes', 'string', Rule::in(RestaurantTable::statuses())],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (! $this->hasAny(['name', 'capacity', 'status'])) {
                $validator->errors()->add('status', 'Provide at least one field to update.');
            }
        });
    }
}

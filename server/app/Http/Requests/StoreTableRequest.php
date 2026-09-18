<?php

namespace App\Http\Requests;

use App\Models\Permission;
use App\Models\RestaurantTable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTableRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:50'],
            'status' => ['sometimes', 'string', Rule::in(RestaurantTable::statuses())],
        ];
    }
}

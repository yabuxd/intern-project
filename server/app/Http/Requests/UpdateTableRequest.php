<?php

namespace App\Http\Requests;

use App\Models\RestaurantTable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('can_manage_tables') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(RestaurantTable::statuses())],
        ];
    }
}

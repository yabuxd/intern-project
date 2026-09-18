<?php

namespace App\Http\Requests;

use App\Models\MenuChangeRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMenuChangeRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', MenuChangeRequest::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'action' => ['required', 'string', Rule::in(MenuChangeRequest::actions())],
            'menu_item_id' => ['required_if:action,delete', 'nullable', 'integer', 'exists:menu_items,id'],
            'menu_category_id' => ['required_if:action,create', 'nullable', 'integer', 'exists:menu_categories,id'],
            'name' => ['required_if:action,create', 'nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'price' => ['required_if:action,create', 'nullable', 'numeric', 'min:0', 'max:999999.99'],
            'is_available' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}

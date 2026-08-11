<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMenuItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('can_manage_menu') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'menu_category_id' => ['sometimes', 'integer', 'exists:menu_categories,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'file', 'mimes:jpeg,jpg,png,webp,gif', 'max:5120'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:999999.99'],
            'is_available' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_available')) {
            $this->merge([
                'is_available' => filter_var($this->input('is_available'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }
}

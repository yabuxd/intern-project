<?php

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'fulfillment_type' => ['sometimes', 'string', Rule::in(Order::fulfillmentTypes())],
            'table_id' => ['nullable', 'integer', 'exists:tables,id'],
            'delivery_address' => ['nullable', 'string', 'max:500'],
            'delivery_phone' => ['nullable', 'string', 'max:40'],
            'delivery_notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.menu_item_id' => ['required', 'integer', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $type = $this->input('fulfillment_type', Order::FULFILLMENT_DINE_IN);

            if ($type === Order::FULFILLMENT_DELIVERY) {
                if ($this->filled('table_id')) {
                    $validator->errors()->add('table_id', 'Delivery orders cannot be assigned to a table.');
                }
                if (! is_string($this->input('delivery_address')) || trim((string) $this->input('delivery_address')) === '') {
                    $validator->errors()->add('delivery_address', 'A delivery address is required.');
                }
                if (! is_string($this->input('delivery_phone')) || trim((string) $this->input('delivery_phone')) === '') {
                    $validator->errors()->add('delivery_phone', 'A delivery phone number is required.');
                }
            }
        });
    }
}

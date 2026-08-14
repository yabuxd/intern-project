<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMenuChangeRequestRequest;
use App\Models\MenuChangeRequest;
use App\Models\Permission;
use App\Services\ApiCacheService;
use App\Services\MenuChangeRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuChangeRequestController extends Controller
{
    public function __construct(
        private readonly MenuChangeRequestService $changes,
        private readonly ApiCacheService $cache,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MenuChangeRequest::class);

        $user = $request->user();
        $query = MenuChangeRequest::query()
            ->select([
                'id',
                'requester_id',
                'action',
                'menu_item_id',
                'payload',
                'status',
                'reviewer_id',
                'reviewed_at',
                'review_note',
                'created_at',
            ])
            ->with([
                'requester:id,name,email',
                'reviewer:id,name,email',
                'menuItem:id,name',
            ])
            ->orderByDesc('id');

        if (! $user->can(Permission::CAN_MANAGE_MENU)) {
            $query->where('requester_id', $user->id);
        }

        $status = $request->query('status');
        if (is_string($status) && $status !== '') {
            $query->where('status', $status);
        }

        return response()->json([
            'success' => true,
            'data' => $query->limit(100)->get()->map(fn (MenuChangeRequest $change) => $this->transform($change)),
        ]);
    }

    public function store(StoreMenuChangeRequestRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $action = $validated['action'];

        $change = MenuChangeRequest::query()->create([
            'requester_id' => $request->user()->id,
            'action' => $action,
            'menu_item_id' => $action === MenuChangeRequest::ACTION_DELETE
                ? $validated['menu_item_id']
                : null,
            'payload' => $action === MenuChangeRequest::ACTION_CREATE
                ? [
                    'menu_category_id' => $validated['menu_category_id'],
                    'name' => $validated['name'],
                    'description' => $validated['description'] ?? null,
                    'image_url' => $validated['image_url'] ?? null,
                    'price' => $validated['price'],
                    'is_available' => $validated['is_available'] ?? true,
                    'sort_order' => $validated['sort_order'] ?? 0,
                ]
                : null,
            'status' => MenuChangeRequest::STATUS_PENDING,
        ]);

        $change->load(['requester:id,name,email', 'menuItem:id,name']);

        return response()->json([
            'success' => true,
            'data' => $this->transform($change),
            'message' => 'Sent for manager or admin approval.',
        ], 201);
    }

    public function approve(Request $request, MenuChangeRequest $menuChangeRequest): JsonResponse
    {
        $this->authorize('review', $menuChangeRequest);

        $change = $this->changes->apply($menuChangeRequest, $request->user());
        $this->cache->forgetMenu();

        return response()->json([
            'success' => true,
            'data' => $this->transform($change),
            'message' => 'Menu change approved.',
        ]);
    }

    public function reject(Request $request, MenuChangeRequest $menuChangeRequest): JsonResponse
    {
        $this->authorize('review', $menuChangeRequest);

        $note = $request->validate([
            'review_note' => ['nullable', 'string', 'max:255'],
        ])['review_note'] ?? null;

        $change = $this->changes->reject($menuChangeRequest, $request->user(), $note);

        return response()->json([
            'success' => true,
            'data' => $this->transform($change),
            'message' => 'Menu change rejected.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(MenuChangeRequest $change): array
    {
        return [
            'id' => $change->id,
            'action' => $change->action,
            'status' => $change->status,
            'menu_item_id' => $change->menu_item_id,
            'payload' => $change->payload,
            'review_note' => $change->review_note,
            'created_at' => $change->created_at?->toIso8601String(),
            'reviewed_at' => $change->reviewed_at?->toIso8601String(),
            'requester' => $change->relationLoaded('requester') && $change->requester
                ? [
                    'id' => $change->requester->id,
                    'name' => $change->requester->name,
                    'email' => $change->requester->email,
                ]
                : null,
            'reviewer' => $change->relationLoaded('reviewer') && $change->reviewer
                ? [
                    'id' => $change->reviewer->id,
                    'name' => $change->reviewer->name,
                    'email' => $change->reviewer->email,
                ]
                : null,
            'menu_item' => $change->relationLoaded('menuItem') && $change->menuItem
                ? [
                    'id' => $change->menuItem->id,
                    'name' => $change->menuItem->name,
                ]
                : null,
        ];
    }
}

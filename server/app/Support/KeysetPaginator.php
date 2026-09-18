<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

final class KeysetPaginator
{
    /**
     * Cursor pagination via `after_id` + `LIMIT n+1` (no OFFSET, no COUNT(*)).
     *
     * @return array{0: Collection, 1: array{next_cursor: mixed, has_more: bool}}
     */
    public static function paginate(
        Builder $query,
        Request $request,
        string $column = 'id',
        string $direction = 'asc',
        int $defaultLimit = 50,
        int $maxLimit = 100,
    ): array {
        $limit = min($maxLimit, max(1, (int) $request->integer('limit', $defaultLimit)));
        $after = $request->query('after_id');

        if (is_string($after) && $after !== '') {
            $operator = strtolower($direction) === 'desc' ? '<' : '>';
            $query->where($column, $operator, $after);
        }

        $rows = $query->orderBy($column, $direction)->limit($limit + 1)->get();
        $hasMore = $rows->count() > $limit;
        $page = $hasMore ? $rows->slice(0, $limit)->values() : $rows;
        $last = $page->last();

        return [
            $page,
            [
                'next_cursor' => $hasMore && $last ? $last->getAttribute($column) : null,
                'has_more' => $hasMore,
            ],
        ];
    }
}

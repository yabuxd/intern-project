<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->dropIndexIfExists('orders', ['user_id', 'created_at']);
        $this->dropIndexIfExists('orders', ['status', 'created_at']);
        $this->dropIndexIfExists('orders', ['fulfillment_type', 'status']);
        $this->addIndexIfMissing('orders', ['table_id']);
        $this->addIndexIfMissing('orders', ['driver_id']);
        $this->addIndexIfMissing('orders', ['user_id', 'id']);
        $this->addIndexIfMissing('orders', ['status', 'id']);
        $this->addIndexIfMissing('orders', ['fulfillment_type', 'status', 'id']);

        $this->addIndexIfMissing('order_items', ['order_id']);
        $this->addIndexIfMissing('order_items', ['menu_item_id']);

        $this->addIndexIfMissing('user_roles', ['role_id']);
        $this->addIndexIfMissing('role_permissions', ['permission_id']);

        $this->addIndexIfMissing('tables', ['status']);
        $this->addIndexIfMissing('tables', ['name']);

        $this->addIndexIfMissing('menu_categories', ['sort_order', 'name']);

        $this->dropIndexIfExists('reservations', ['table_id', 'starts_at', 'ends_at']);
        $this->addIndexIfMissing('reservations', ['table_id', 'status', 'starts_at', 'ends_at']);
        $this->addIndexIfMissing('reservations', ['status', 'id']);

        $this->addIndexIfMissing('users', ['name']);
    }

    public function down(): void
    {
        $this->dropIndexIfExists('orders', ['table_id']);
        $this->dropIndexIfExists('orders', ['driver_id']);
        $this->dropIndexIfExists('orders', ['user_id', 'id']);
        $this->dropIndexIfExists('orders', ['status', 'id']);
        $this->dropIndexIfExists('orders', ['fulfillment_type', 'status', 'id']);
        $this->addIndexIfMissing('orders', ['user_id', 'created_at']);
        $this->addIndexIfMissing('orders', ['status', 'created_at']);
        $this->addIndexIfMissing('orders', ['fulfillment_type', 'status']);

        $this->dropIndexIfExists('order_items', ['order_id']);
        $this->dropIndexIfExists('order_items', ['menu_item_id']);

        $this->dropIndexIfExists('user_roles', ['role_id']);
        $this->dropIndexIfExists('role_permissions', ['permission_id']);

        $this->dropIndexIfExists('tables', ['status']);
        $this->dropIndexIfExists('tables', ['name']);

        $this->dropIndexIfExists('menu_categories', ['sort_order', 'name']);

        $this->dropIndexIfExists('reservations', ['table_id', 'status', 'starts_at', 'ends_at']);
        $this->dropIndexIfExists('reservations', ['status', 'id']);
        $this->addIndexIfMissing('reservations', ['table_id', 'starts_at', 'ends_at']);

        $this->dropIndexIfExists('users', ['name']);
    }

    /**
     * @param  list<string>  $columns
     */
    private function dropIndexIfExists(string $table, array $columns): void
    {
        $name = $this->indexName($table, $columns);
        if (! $this->indexExists($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns) {
            $blueprint->dropIndex($columns);
        });
    }

    /**
     * @param  list<string>  $columns
     */
    private function addIndexIfMissing(string $table, array $columns): void
    {
        $name = $this->indexName($table, $columns);
        if ($this->indexExists($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns) {
            $blueprint->index($columns);
        });
    }

    /**
     * @param  list<string>  $columns
     */
    private function indexName(string $table, array $columns): string
    {
        return $table.'_'.implode('_', $columns).'_index';
    }

    private function indexExists(string $table, string $indexName): bool
    {
        if (DB::getDriverName() === 'pgsql') {
            $row = DB::selectOne(
                'SELECT 1 AS ok FROM pg_indexes WHERE schemaname = current_schema() AND tablename = ? AND indexname = ?',
                [$table, $indexName],
            );

            return $row !== null;
        }

        return Schema::hasIndex($table, $indexName);
    }
};

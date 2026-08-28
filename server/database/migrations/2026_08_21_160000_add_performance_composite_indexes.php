<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addIndexIfMissing('orders', ['payment_method', 'payment_status', 'cashier_approved_at']);
        $this->addIndexIfMissing('orders', ['payment_method', 'payment_status', 'cash_collected_at']);
        $this->addIndexIfMissing('orders', ['created_at', 'status', 'payment_status']);
        $this->addIndexIfMissing('menu_items', ['menu_category_id', 'is_available', 'sort_order']);
    }

    public function down(): void
    {
        $this->dropIndexIfExists('orders', ['payment_method', 'payment_status', 'cashier_approved_at']);
        $this->dropIndexIfExists('orders', ['payment_method', 'payment_status', 'cash_collected_at']);
        $this->dropIndexIfExists('orders', ['created_at', 'status', 'payment_status']);
        $this->dropIndexIfExists('menu_items', ['menu_category_id', 'is_available', 'sort_order']);
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

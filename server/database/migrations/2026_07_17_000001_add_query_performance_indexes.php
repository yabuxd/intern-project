<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->index('order_id');
            $table->index('menu_item_id');
        });

        Schema::table('menu_items', function (Blueprint $table) {
            $table->index(['menu_category_id', 'is_available']);
            $table->index(['menu_category_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'created_at']);
            $table->dropIndex(['status', 'created_at']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['order_id']);
            $table->dropIndex(['menu_item_id']);
        });

        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropIndex(['menu_category_id', 'is_available']);
            $table->dropIndex(['menu_category_id', 'sort_order']);
        });
    }
};

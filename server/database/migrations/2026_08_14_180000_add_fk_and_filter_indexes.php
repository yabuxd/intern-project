<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'created_at']);
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['fulfillment_type', 'status']);

            $table->index('table_id');
            $table->index('driver_id');
            $table->index(['user_id', 'id']);
            $table->index(['status', 'id']);
            $table->index(['fulfillment_type', 'status', 'id']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->index('order_id');
            $table->index('menu_item_id');
        });

        Schema::table('user_roles', function (Blueprint $table) {
            $table->index('role_id');
        });

        Schema::table('role_permissions', function (Blueprint $table) {
            $table->index('permission_id');
        });

        Schema::table('tables', function (Blueprint $table) {
            $table->index('status');
            $table->index('name');
        });

        Schema::table('menu_categories', function (Blueprint $table) {
            $table->index(['sort_order', 'name']);
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex(['table_id', 'starts_at', 'ends_at']);
            $table->index(['table_id', 'status', 'starts_at', 'ends_at']);
            $table->index(['status', 'id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['table_id']);
            $table->dropIndex(['driver_id']);
            $table->dropIndex(['user_id', 'id']);
            $table->dropIndex(['status', 'id']);
            $table->dropIndex(['fulfillment_type', 'status', 'id']);

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index(['fulfillment_type', 'status']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['order_id']);
            $table->dropIndex(['menu_item_id']);
        });

        Schema::table('user_roles', function (Blueprint $table) {
            $table->dropIndex(['role_id']);
        });

        Schema::table('role_permissions', function (Blueprint $table) {
            $table->dropIndex(['permission_id']);
        });

        Schema::table('tables', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['name']);
        });

        Schema::table('menu_categories', function (Blueprint $table) {
            $table->dropIndex(['sort_order', 'name']);
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex(['table_id', 'status', 'starts_at', 'ends_at']);
            $table->dropIndex(['status', 'id']);
            $table->index(['table_id', 'starts_at', 'ends_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['name']);
        });
    }
};

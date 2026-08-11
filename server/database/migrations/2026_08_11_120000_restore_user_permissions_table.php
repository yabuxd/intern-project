<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_permissions')) {
            Schema::create('user_permissions', function (Blueprint $table) {
                $table->id();
                $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['user_id', 'permission_id']);
            });
        }

        if (
            Schema::hasTable('user_roles')
            && Schema::hasTable('role_permissions')
            && Schema::hasTable('user_permissions')
        ) {
            $now = now();
            $rows = DB::table('user_roles')
                ->join('role_permissions', 'user_roles.role_id', '=', 'role_permissions.role_id')
                ->select('user_roles.user_id', 'role_permissions.permission_id')
                ->distinct()
                ->get();

            foreach ($rows as $row) {
                DB::table('user_permissions')->insertOrIgnore([
                    'user_id' => $row->user_id,
                    'permission_id' => $row->permission_id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Keep user_permissions; it is required by the current app schema.
    }
};

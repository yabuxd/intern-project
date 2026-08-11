<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('user_permissions');
    }

    public function down(): void
    {
        // Intentionally empty: RBAC uses roles / role_permissions / user_roles.
    }
};

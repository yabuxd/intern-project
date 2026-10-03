<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_change_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('requester_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 16);
            $table->foreignId('menu_item_id')->nullable()->constrained('menu_items')->nullOnDelete();
            $table->json('payload')->nullable();
            $table->string('status', 16)->default('pending');
            $table->foreignUuid('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('review_note')->nullable();
            $table->timestamps();

            $table->index(['status', 'id']);
            $table->index('requester_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_change_requests');
    }
};

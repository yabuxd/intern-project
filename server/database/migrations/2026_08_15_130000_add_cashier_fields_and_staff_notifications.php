<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('cashier_approved_at')->nullable()->after('paid_at');
            $table->foreignUuid('cashier_approved_by')->nullable()->after('cashier_approved_at')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('cash_collected_at')->nullable()->after('cashier_approved_by');
            $table->foreignUuid('cash_collected_by')->nullable()->after('cash_collected_at')
                ->constrained('users')->nullOnDelete();
        });

        Schema::create('staff_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('type');
            $table->string('title');
            $table->string('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_notifications');

        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cashier_approved_by');
            $table->dropConstrainedForeignId('cash_collected_by');
            $table->dropColumn([
                'cashier_approved_at',
                'cash_collected_at',
            ]);
        });
    }
};

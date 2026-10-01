<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('fulfillment_type')->default('dine_in')->after('table_id');
            $table->string('delivery_address')->nullable()->after('fulfillment_type');
            $table->string('delivery_phone')->nullable()->after('delivery_address');
            $table->string('delivery_notes')->nullable()->after('delivery_phone');
            $table->foreignUuid('driver_id')->nullable()->after('delivery_notes')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('driver_id');
            $table->dropColumn([
                'fulfillment_type',
                'delivery_address',
                'delivery_phone',
                'delivery_notes',
            ]);
        });
    }
};

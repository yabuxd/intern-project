<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        if (! Schema::hasTable('orders')) {
            return;
        }

        $publication = DB::selectOne(
            "SELECT 1 AS ok FROM pg_publication WHERE pubname = 'supabase_realtime'"
        );

        if ($publication === null) {
            return;
        }

        $already = DB::selectOne(
            "SELECT 1 AS ok
             FROM pg_publication_tables
             WHERE pubname = 'supabase_realtime'
               AND schemaname = 'public'
               AND tablename = 'orders'"
        );

        if ($already !== null) {
            return;
        }

        DB::unprepared('ALTER PUBLICATION supabase_realtime ADD TABLE public.orders');
        DB::unprepared('ALTER TABLE public.orders REPLICA IDENTITY FULL');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $publication = DB::selectOne(
            "SELECT 1 AS ok FROM pg_publication WHERE pubname = 'supabase_realtime'"
        );

        if ($publication === null) {
            return;
        }

        $already = DB::selectOne(
            "SELECT 1 AS ok
             FROM pg_publication_tables
             WHERE pubname = 'supabase_realtime'
               AND schemaname = 'public'
               AND tablename = 'orders'"
        );

        if ($already === null) {
            return;
        }

        DB::unprepared('ALTER PUBLICATION supabase_realtime DROP TABLE public.orders');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $hasAuth = DB::selectOne("SELECT 1 AS ok FROM pg_namespace WHERE nspname = 'auth'");
        if ($hasAuth === null) {
            return;
        }

        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles
        INNER JOIN roles ON roles.id = user_roles.role_id
        WHERE user_roles.user_id = (SELECT auth.uid())
          AND roles.name IN ('kitchen', 'host', 'manager', 'admin', 'driver')
    );
$$;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_select ON orders;
CREATE POLICY orders_select ON orders
    FOR SELECT
    USING (
        user_id = (SELECT auth.uid())
        OR driver_id = (SELECT auth.uid())
        OR public.is_staff()
    );

DROP POLICY IF EXISTS orders_insert ON orders;
CREATE POLICY orders_insert ON orders
    FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS order_items_select ON order_items;
CREATE POLICY order_items_select ON order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM orders
            WHERE orders.id = order_items.order_id
              AND (
                  orders.user_id = (SELECT auth.uid())
                  OR orders.driver_id = (SELECT auth.uid())
                  OR public.is_staff()
              )
        )
    );

DROP POLICY IF EXISTS reservations_select ON reservations;
CREATE POLICY reservations_select ON reservations
    FOR SELECT
    USING (
        user_id = (SELECT auth.uid())
        OR public.is_staff()
    );

DROP POLICY IF EXISTS reservations_insert ON reservations;
CREATE POLICY reservations_insert ON reservations
    FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS menu_public_read ON menu_items;
CREATE POLICY menu_public_read ON menu_items
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS menu_categories_public_read ON menu_categories;
CREATE POLICY menu_categories_public_read ON menu_categories
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS tables_public_read ON tables;
CREATE POLICY tables_public_read ON tables
    FOR SELECT
    USING (true);
SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<'SQL'
DROP POLICY IF EXISTS orders_select ON orders;
DROP POLICY IF EXISTS orders_insert ON orders;
DROP POLICY IF EXISTS order_items_select ON order_items;
DROP POLICY IF EXISTS reservations_select ON reservations;
DROP POLICY IF EXISTS reservations_insert ON reservations;
DROP POLICY IF EXISTS menu_public_read ON menu_items;
DROP POLICY IF EXISTS menu_categories_public_read ON menu_categories;
DROP POLICY IF EXISTS tables_public_read ON tables;
DROP FUNCTION IF EXISTS public.is_staff();
SQL);
    }
};

<?php

namespace App\Console\Commands;

use App\Models\Order;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExplainQueryPlansCommand extends Command
{
    protected $signature = 'query:plan {--analyze : Use EXPLAIN ANALYZE on PostgreSQL}';

    protected $description = 'Print query plans for the hottest list endpoints and flag sequential scans';

    public function handle(): int
    {
        $driver = DB::getDriverName();
        $analyze = (bool) $this->option('analyze') && $driver === 'pgsql';

        $queries = [
            'customer_orders' => 'select id, user_id, status, total, created_at from orders where user_id = \'00000000-0000-0000-0000-000000000001\' order by id desc limit 51',
            'kitchen_queue' => 'select id, status, created_at from orders where status in (\'pending\', \'preparing\', \'ready\') order by id asc limit 51',
            'deliveries' => 'select id, fulfillment_type, status from orders where fulfillment_type = \'delivery\' and status in (\'ready\', \'out_for_delivery\') order by id asc limit 51',
            'menu' => 'select id, name, slug, sort_order from menu_categories order by sort_order asc, name asc',
            'reservation_overlap' => 'select id from reservations where table_id = 1 and status = \'confirmed\' and starts_at < datetime(\'now\') and ends_at > datetime(\'now\') limit 1',
        ];

        if ($driver === 'pgsql') {
            $queries['reservation_overlap'] = 'select id from reservations where table_id = 1 and status = \'confirmed\' and starts_at < now() and ends_at > now() limit 1';
        }

        $foundSeqScan = false;

        foreach ($queries as $name => $sql) {
            $this->newLine();
            $this->info($name);

            $planSql = match ($driver) {
                'pgsql' => ($analyze ? 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ' : 'EXPLAIN ').$sql,
                default => 'EXPLAIN QUERY PLAN '.$sql,
            };

            try {
                $rows = DB::select($planSql);
            } catch (\Throwable $e) {
                $this->warn('  skipped: '.$e->getMessage());

                continue;
            }

            foreach ($rows as $row) {
                $line = implode(' | ', array_map(strval(...), (array) $row));
                $this->line('  '.$line);
                if (str_contains(strtolower($line), 'seq scan') || str_contains(strtolower($line), 'scan table')) {
                    $foundSeqScan = true;
                }
            }
        }

        $this->newLine();
        $this->line('orders rows: '.Order::query()->count());

        if ($foundSeqScan) {
            $this->warn('Sequential scan detected. Confirm indexes exist and the table is large enough that the planner prefers them.');
        } else {
            $this->info('No sequential scans reported on the hot queries.');
        }

        return self::SUCCESS;
    }
}

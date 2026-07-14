import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const POLL_INTERVAL_MS = 5000;

/**
 * Subscribes to Postgres changes on the `orders` table via Supabase Realtime.
 * Enable Realtime for the `orders` table in the Supabase dashboard for production.
 * Local SQLite dev cannot push to Supabase — falls back to polling when URL is unset
 * or when the realtime channel fails to connect.
 */
export function useOrdersRealtime(onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const trigger = useCallback(() => {
    onChangeRef.current();
  }, []);

  useEffect(() => {
    let pollId: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const startPolling = () => {
      if (pollId) return;
      pollId = setInterval(trigger, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      startPolling();
      return () => stopPolling();
    }

    channel = supabase
      .channel('orders-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => trigger(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          stopPolling();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startPolling();
        }
      });

    // Start polling until realtime confirms subscription
    startPolling();

    return () => {
      stopPolling();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [trigger]);
}

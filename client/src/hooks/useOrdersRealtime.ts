import { useCallback, useEffect, useRef } from 'react';
import { isLocalAuth } from '../services/localAuth';
import { supabase } from '../services/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const POLL_INTERVAL_MS = 5000;
const LOCAL_POLL_INTERVAL_MS = 12_000;
/** Wait for Realtime before falling back to polling (avoids double-fetch when subscribed). */
const POLL_FALLBACK_DELAY_MS = 2500;

export const QUEUE_ORDERS_FILTER = 'status=in.(pending,accepted,preparing,ready)';
export const DELIVERY_ORDERS_FILTER = 'fulfillment_type=eq.delivery';

/**
 * Subscribes to a filtered slice of `orders` via Supabase Realtime.
 * Falls back to polling when Realtime is unavailable (local auth / SQLite / network).
 */
export function useOrdersRealtime(onChange: () => void, filter?: string) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const trigger = useCallback(() => {
    onChangeRef.current();
  }, []);

  useEffect(() => {
    let pollId: ReturnType<typeof setInterval> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let subscribed = false;

    const startPolling = (intervalMs = POLL_INTERVAL_MS) => {
      if (pollId || subscribed) return;
      pollId = setInterval(trigger, intervalMs);
    };

    const stopPolling = () => {
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    // Local Laravel/SQLite does not publish to Supabase Realtime — poll the API instead.
    if (
      isLocalAuth() ||
      import.meta.env.VITE_AUTH_MODE === 'local' ||
      !supabaseUrl ||
      supabaseUrl === 'https://placeholder.supabase.co'
    ) {
      startPolling(LOCAL_POLL_INTERVAL_MS);
      return () => stopPolling();
    }

    const channelName = filter ? `orders:${filter}` : 'orders';

    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(filter ? { filter } : {}),
        },
        () => trigger(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          stopPolling();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          subscribed = false;
          startPolling();
        }
      });

    fallbackTimer = setTimeout(() => startPolling(), POLL_FALLBACK_DELAY_MS);

    return () => {
      stopPolling();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [filter, trigger]);
}

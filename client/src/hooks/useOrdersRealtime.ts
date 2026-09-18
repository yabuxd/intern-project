import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const POLL_INTERVAL_MS = 5000;
/** Wait for Realtime before falling back to polling (avoids double-fetch when subscribed). */
const POLL_FALLBACK_DELAY_MS = 2500;

export const QUEUE_ORDERS_FILTER = 'status=in.(pending,accepted,preparing,ready)';
export const DELIVERY_ORDERS_FILTER = 'fulfillment_type=eq.delivery';

/**
 * Subscribes to a filtered slice of `orders` via Supabase Realtime.
 * Falls back to polling only if Realtime is missing or fails (e.g. local SQLite).
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

    const startPolling = () => {
      if (pollId || subscribed) return;
      pollId = setInterval(trigger, POLL_INTERVAL_MS);
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

    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      startPolling();
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

    fallbackTimer = setTimeout(startPolling, POLL_FALLBACK_DELAY_MS);

    return () => {
      stopPolling();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [filter, trigger]);
}

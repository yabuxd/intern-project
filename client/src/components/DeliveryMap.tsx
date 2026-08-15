import { useEffect, useState } from 'react';

interface DeliveryMapProps {
  address: string;
  className?: string;
  compact?: boolean;
  /** Cart uses light; kitchen/orders pages use dark. */
  tone?: 'light' | 'dark';
}

export function DeliveryMap({
  address,
  className = '',
  compact = false,
  tone = 'dark',
}: DeliveryMapProps) {
  const trimmed = address.trim();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (trimmed.length < 5) {
      setQuery('');
      return;
    }
    const timer = window.setTimeout(() => setQuery(trimmed), 900);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  const hintClass =
    tone === 'light' ? 'text-xs text-stone-500' : 'text-xs text-[var(--color-cream-muted)]';
  const shellClass =
    tone === 'light'
      ? 'overflow-hidden rounded-lg border border-stone-200 bg-stone-50'
      : 'overflow-hidden border border-[var(--color-brass)]/25';
  const linkClass =
    tone === 'light'
      ? 'block bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:underline'
      : 'block bg-[var(--color-espresso)] px-3 py-1.5 text-xs font-medium text-[var(--color-brass)] hover:underline';

  if (!query) {
    return (
      <p className={`${hintClass} ${className}`}>
        {trimmed.length === 0
          ? 'Enter an address to preview the map.'
          : 'Keep typing — map preview appears after a short pause.'}
      </p>
    );
  }

  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
  const openHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className={`${shellClass} ${className}`}>
      <iframe
        title={`Map of ${query}`}
        src={embedSrc}
        className={`pointer-events-none w-full border-0 ${compact ? 'h-28' : 'h-36'}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        tabIndex={-1}
      />
      <a href={openHref} target="_blank" rel="noreferrer" className={linkClass}>
        Open in Maps →
      </a>
    </div>
  );
}

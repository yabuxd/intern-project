import { useEffect, useState } from 'react';

interface DeliveryMapProps {
  address: string;
  className?: string;
  compact?: boolean;
}

export function DeliveryMap({ address, className = '', compact = false }: DeliveryMapProps) {
  const trimmed = address.trim();
  const [query, setQuery] = useState(trimmed);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(trimmed), 600);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  if (!query) {
    return (
      <p className={`text-xs text-[var(--color-cream-muted)] ${className}`}>
        Enter an address to preview the map.
      </p>
    );
  }

  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
  const openHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className={`overflow-hidden border border-[var(--color-brass)]/25 ${className}`}>
      <iframe
        title={`Map of ${query}`}
        src={embedSrc}
        className={`w-full border-0 ${compact ? 'h-36' : 'h-44'}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={openHref}
        target="_blank"
        rel="noreferrer"
        className="block bg-[var(--color-espresso)] px-3 py-1.5 text-xs font-medium text-[var(--color-brass)] hover:underline"
      >
        Open in Maps →
      </a>
    </div>
  );
}

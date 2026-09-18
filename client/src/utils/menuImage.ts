const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

/** Resolve menu image paths for display (absolute, /storage, or client public). */
export function resolveMenuImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/storage/')) {
    const origin = apiBaseUrl.replace(/\/api\/?$/, '');
    return `${origin}${url}`;
  }
  return url;
}

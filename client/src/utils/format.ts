export function formatEtb(price: string | number): string {
  const value = typeof price === 'string' ? Number(price) : price;
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(value);
}

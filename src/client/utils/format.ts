export const COIN_SYMBOL = '₵';

export const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) =>
  `${COIN_SYMBOL}${Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value)}`;

export const formatPercent = (value: number, options?: Intl.NumberFormatOptions) =>
  `${Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    ...options,
  }).format(value / 100)}`;

export const formatCompactNumber = (value: number) =>
  Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export const formatTime = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

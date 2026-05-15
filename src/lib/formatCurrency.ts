const VALID_CURRENCIES = new Set([
  'USD', 'GBP', 'EUR', 'AUD', 'CAD',
]);

export function normalizeCurrency(code: string | null | undefined): string {
  const c = (code ?? 'USD').toUpperCase();
  return VALID_CURRENCIES.has(c) ? c : 'USD';
}

export function formatCurrencyAmount(
  amount: number,
  currencyCode: string | null | undefined,
  options?: Intl.NumberFormatOptions,
): string {
  const currency = normalizeCurrency(currencyCode);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}

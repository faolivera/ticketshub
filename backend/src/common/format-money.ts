/**
 * Format a money amount (in cents) for display in notifications and emails.
 * Matches frontend formatCurrency behavior: ARS uses "$"; other currencies use Intl.
 * Uses es-AR by default (dot thousands, comma decimal) to align with app copy.
 */
export function formatMoney(
  amountInCents: number,
  currency: string,
  locale: string = 'es-AR',
): string {
  const amount = amountInCents / 100;
  if (currency === 'ARS') {
    return (
      '$' +
      amount.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

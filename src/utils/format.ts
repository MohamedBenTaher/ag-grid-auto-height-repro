export function formatCurrency(amount: number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof num !== 'number' || isNaN(num)) {
    return '0,00€';
  }
  const formatted = new Intl.NumberFormat('fi-FI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `${formatted}€`;
}

export function formatPercentage(value: number): string {
  return `${value}%`;
}

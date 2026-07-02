export function formatCurrency(amount: number) {
  return `¥${amount.toFixed(2)}`;
}

export function formatUsd(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export function formatBeijingDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (part: number) => part.toString().padStart(2, '0');

  return [
    `${beijingTime.getUTCFullYear()}-${pad(beijingTime.getUTCMonth() + 1)}-${pad(beijingTime.getUTCDate())}`,
    `${pad(beijingTime.getUTCHours())}:${pad(beijingTime.getUTCMinutes())}:${pad(beijingTime.getUTCSeconds())}`
  ].join(' ');
}

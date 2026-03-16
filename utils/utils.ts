
const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
export const formatCurrency = (amount: number) => currencyFormatter.format(amount);

export const formatCompactCurrency = (amount: number) => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'tr';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
  return amount.toString();
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
};

export const getDaysDiff = (start: string, end: string) => {
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = d2.getTime() - d1.getTime();
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return nights > 0 ? nights : 1;
};

export const formatNumberInput = (val: number | string): string => {
  if (!val) return '';
  const num = typeof val === 'string' ? parseInt(val, 10) : val;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('vi-VN').format(num);
};

export const parseNumberInput = (val: string): number => {
  return parseInt(val.replace(/\./g, ''), 10) || 0;
};

export const addDays = (dateStr: string, days: number): string => {
  const result = new Date(dateStr);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
};

export const isOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  // YYYY-MM-DD string compare works lexicographically
  return aStart < bEnd && aEnd > bStart;
};

export const now = () => Date.now();

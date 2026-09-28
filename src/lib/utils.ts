import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0원';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0원';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('ko-KR').format(num);
}

export function formatPct(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0.00%';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0.00%';
  const prefix = num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(2)}%`;
}

export function formatDate(val: Date | string | null | undefined): string {
  if (!val) return '-';
  const d = typeof val === 'string' ? new Date(val) : val;
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

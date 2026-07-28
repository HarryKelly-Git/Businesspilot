import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// NZ dollars. Intl 'en-NZ' renders NZD as a bare "$", so we prefix "NZ$"
// explicitly for clarity against AUD/USD.
export function formatCurrency(amount: number): string {
  return (
    'NZ$' +
    new Intl.NumberFormat('en-NZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  );
}

// DD/MM/YYYY — New Zealand date order.
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NZ', {
    day: '2-digit',
    month: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const hour = hours % 12 || 12;
  return `${hour}:${minutes.toString().padStart(2, '0')}${period}`;
}

/**
 * Formats a New Zealand phone number for display.
 * Mobiles (021/022/027/029) group as "0xx xxx xxxx"; landlines as "0x xxx xxxx"
 * with the area code (03 Canterbury, 09 Auckland, 04 Wellington, 07 Waikato/BOP,
 * 06 lower North Island). Accepts +64 / 64 / 0-prefixed input.
 */
export function formatNZPhone(phone: string): string {
  let d = phone.replace(/[^\d+]/g, '');
  if (d.startsWith('+64')) d = '0' + d.slice(3);
  else if (d.startsWith('64') && !d.startsWith('0')) d = '0' + d.slice(2);

  const mobilePrefixes = ['021', '022', '027', '029'];
  if (mobilePrefixes.some((p) => d.startsWith(p))) {
    // 0xx xxx xxxx / 0xx xxx xxx
    return d.length >= 9
      ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`.trim()
      : d;
  }
  if (d.startsWith('0') && d.length === 9) {
    // Landline: 0x xxx xxxx
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  }
  return phone;
}

// Kept as an alias so existing imports keep working, now NZ-formatted.
export const formatPhone = formatNZPhone;

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(date);
}

export function getDayName(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(date));
}

export function generateTimeSlots(
  start: string,
  end: string,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const minute = currentMinutes % 60;
    slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

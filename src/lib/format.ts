// Numeric columns arrive from PostgREST as numbers or strings; accept both.
export function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : Number(v);
}

export function money(v: number | string | null | undefined): string {
  return '$' + num(v).toFixed(2);
}

/** Whole dollars for dashboard figures: $684 */
export function moneyShort(v: number | string | null | undefined): string {
  const n = num(v);
  return '$' + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
}

// pickup_date is a calendar date (yyyy-mm-dd); format it without timezone shifts.
function dateOnly(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12));
}

export function formatDate(d: string, style: 'long' | 'short' | 'weekday' = 'long'): string {
  const opts: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }
      : style === 'short'
        ? { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }
        : { weekday: 'long', timeZone: 'UTC' };
  return dateOnly(d).toLocaleDateString('en-US', opts);
}

/** "Friday, Oct 16 at 8:00 PM" in the business timezone. */
export function formatDeadline(iso: string, timeZone: string, style: 'long' | 'short' = 'long'): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-US', {
    weekday: style === 'long' ? 'long' : 'short',
    ...(style === 'long' ? { month: 'short', day: 'numeric' } : {}),
    timeZone,
  });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
  return style === 'long' ? `${day} at ${time}` : `${day} ${time}`;
}

/** Activity-log style timestamp: "Thu 6:42 PM", or "Just now". */
export function formatWhen(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Date.now() - d.getTime() < 60_000) return 'Just now';
  return d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone });
}

export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '');
  const local = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (local.length !== 10) return digits;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function itemCount(n: number): string {
  return `${n} item${n === 1 ? '' : 's'}`;
}

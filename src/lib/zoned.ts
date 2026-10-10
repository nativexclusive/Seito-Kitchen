// Small timezone helpers so menu deadlines are entered in the business's local time
// (business_settings.timezone) regardless of where the chef's phone is.

function wallParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') % 24, mi: get('minute') };
}

/** The UTC instant for a wall-clock time in `timeZone`. */
export function zonedToIso(date: string, hour: number, minute: number, timeZone: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d, hour, minute);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const w = wallParts(guess, timeZone);
    const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi);
    guess += target - asUtc;
  }
  return new Date(guess).toISOString();
}

/** Wall-clock date (yyyy-mm-dd) and hour/minute of an instant in `timeZone`. */
export function isoToZoned(iso: string, timeZone: string): { date: string; hour: number; minute: number } {
  const w = wallParts(new Date(iso).getTime(), timeZone);
  return { date: `${w.y}-${String(w.m).padStart(2, '0')}-${String(w.d).padStart(2, '0')}`, hour: w.h, minute: w.mi };
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Today's date in `timeZone`. */
export function todayIn(timeZone: string): string {
  return isoToZoned(new Date().toISOString(), timeZone).date;
}

/** The next Saturday on or after tomorrow. */
export function nextSaturday(timeZone: string): string {
  const today = todayIn(timeZone);
  const [y, m, d] = today.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(today, dow === 6 ? 7 : 6 - dow);
}

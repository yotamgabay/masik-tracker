/** פורמט מספרים עם פסיקים, בלי תלות ב-Intl */
export function fmt(v: number | null | undefined, decimals = 0): string {
  if (typeof v !== 'number' || !isFinite(v)) return '—';
  const fixed = Math.abs(v).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const out = dec && /[1-9]/.test(dec) ? `${withCommas}.${dec.replace(/0+$/, '')}` : withCommas;
  return (v < 0 && Number(fixed) !== 0 ? '-' : '') + out;
}

export const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${fmt(v, 1)}%`);
export const fmtMoney = (v: number | null | undefined) => (v == null ? '—' : `${fmt(v, 0)} ₪`);

/** YYYY-MM-DD → DD.MM.YYYY */
export function fmtDate(d: string | null | undefined, withYear = true): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return withYear ? `${day}.${m}.${y}` : `${day}.${m}`;
}

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export function weekday(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return DAYS[new Date(y, m - 1, day).getDay()];
}

export function todayISO(): string {
  const d = new Date();
  return toISO(d);
}
export function toISO(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(iso: string, delta: number): string {
  const [y, m, day] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, day + delta));
}

/** מקבל טקסט שהמשתמש הקליד ומחזיר מספר או null */
export function parseNum(s: string): number | null {
  const clean = s.replace(/,/g, '.').replace(/[^\d.\-]/g, '');
  if (clean === '' || clean === '.' || clean === '-') return null;
  const v = Number(clean);
  return isFinite(v) ? v : null;
}
export const numToStr = (v: number | null | undefined) => (typeof v === 'number' && isFinite(v) ? String(v) : '');

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

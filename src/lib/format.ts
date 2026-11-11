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

/** שנה מתוך שם המסיק, למשל "מסיק 2018" → 2018 */
export function yearFromName(name: string): number | null {
  const m = name.match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/);
  return m ? Number(m[1]) : null;
}

/**
 * תאריך ברירת מחדל ליום מסיק חדש:
 * - מסיק של השנה הנוכחית (או בלי שנה בשם) → היום
 * - מסיק של שנה אחרת → היום האחרון שכבר הוזן במסיק, ואם אין – 1 באוקטובר של אותה שנה
 */
export function defaultEntryDate(seasonName: string, seasonDates: string[], today = todayISO()): string {
  const year = yearFromName(seasonName);
  if (year == null || String(year) === today.slice(0, 4)) return today;
  const last = [...seasonDates].sort().pop();
  return last ?? `${year}-10-01`;
}

export const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

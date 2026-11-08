import type { AppData, Entry, EntryLine, Season } from './types';

/** משקל סגולי של שמן זית (ק"ג לליטר) – רק להמרת נתונים ישנים שנשמרו בליטרים */
export const OIL_DENSITY = 0.916;
/** מיכל = 18 ק"ג שמן */
export const TANK_KG = 18;
/** מע״מ בישראל (ברירת מחדל למסיק חדש) */
export const DEFAULT_VAT = 18;

const n = (v: number | null | undefined) => (typeof v === 'number' && isFinite(v) ? v : 0);
const has = (v: number | null | undefined): v is number => typeof v === 'number' && isFinite(v);

/** אחוז שמן לפי משקל: ק"ג שמן / ק"ג זיתים */
export function oilPct(kg: number | null, oilKg: number | null): number | null {
  if (!has(kg) || !has(oilKg) || kg <= 0) return null;
  return (oilKg / kg) * 100;
}

export function autoTanks(oilKg: number | null): number | null {
  if (!has(oilKg) || oilKg <= 0) return null;
  // מעגלים למעלה (מיכל חלקי עדיין מיכל), עם סובלנות קטנה לעיגול
  return Math.ceil(oilKg / TANK_KG - 0.02);
}

export const lineTanks = (l: EntryLine) => (has(l.tanksOverride) ? l.tanksOverride : autoTanks(l.oilKg));

export function kgPerBin(kg: number | null, bins: number | null): number | null {
  if (!has(kg) || !has(bins) || bins <= 0) return null;
  return kg / bins;
}

export const workersCost = (e: Pick<Entry, 'workers' | 'costPerWorker'>) =>
  has(e.workers) && has(e.costPerWorker) ? e.workers * e.costPerWorker : null;

export function autoPressCost(e: Pick<Entry, 'lines'>, season: Season | undefined): number | null {
  if (!season || (!has(season.pricePerKg) && !has(season.pricePerTank))) return null;
  let total = 0;
  for (const l of e.lines) {
    total += n(l.kg) * n(season.pricePerKg) + n(lineTanks(l)) * n(season.pricePerTank);
  }
  return total;
}

export type PressCost = { net: number; vat: number; gross: number; rate: number; manual: boolean };

/** מפרק סכום לפני מע״מ / מע״מ / כולל מע״מ */
export function splitVat(amount: number, includesVat: boolean, rate: number) {
  const f = 1 + rate / 100;
  const net = includesVat ? amount / f : amount;
  const gross = includesVat ? amount : amount * f;
  return { net, vat: gross - net, gross };
}

/** תשלום לבית הבד, עם פירוק מע״מ. ידני (אם הוזן) או מחושב לפי המחירים */
export function pressBreakdown(
  e: Pick<Entry, 'lines' | 'pressPaidOverride' | 'pressPaidIncludesVat'>,
  season: Season | undefined,
): PressCost | null {
  const rate = season?.vatRate ?? DEFAULT_VAT;
  if (has(e.pressPaidOverride)) {
    return { ...splitVat(e.pressPaidOverride, e.pressPaidIncludesVat, rate), rate, manual: true };
  }
  const base = autoPressCost(e, season);
  if (base == null) return null;
  return { ...splitVat(base, !!season?.pricesIncludeVat, rate), rate, manual: false };
}

/** התשלום לבית הבד כולל מע״מ */
export const pressCost = (e: Entry, season: Season | undefined) => pressBreakdown(e, season)?.gross ?? null;

export type Totals = {
  entries: number;
  days: number;
  bins: number;
  kg: number;
  /** ק"ג שמן */
  oilKg: number;
  tanks: number;
  workerDays: number;
  workersCost: number;
  /** בית הבד כולל מע״מ */
  pressCost: number;
  pressNet: number;
  pressVat: number;
  totalCost: number;
  /** אחוז שמן משוקלל (רק משורות שיש בהן גם ק"ג זיתים וגם ק"ג שמן) */
  pct: number | null;
  kgPerBin: number | null;
  /** עלות לק"ג שמן */
  costPerOilKg: number | null;
  costPerKg: number | null;
  firstDate: string | null;
  lastDate: string | null;
};

export function emptyTotals(): Totals {
  return {
    entries: 0, days: 0, bins: 0, kg: 0, oilKg: 0, tanks: 0, workerDays: 0,
    workersCost: 0, pressCost: 0, pressNet: 0, pressVat: 0, totalCost: 0, pct: null, kgPerBin: null,
    costPerOilKg: null, costPerKg: null, firstDate: null, lastDate: null,
  };
}

/**
 * מסכם רשומות. אם מסננים לפי סוג זית – העלויות של כל יום מתחלקות
 * בין הסוגים לפי חלק הק"ג של כל סוג באותו יום.
 */
export function summarize(
  data: Pick<AppData, 'seasons'>,
  entries: Entry[],
  lineFilter?: (l: EntryLine, e: Entry) => boolean,
): Totals {
  const t = emptyTotals();
  const days = new Set<string>();
  let pctKg = 0, pctOil = 0, binKg = 0, binBins = 0;

  for (const e of entries) {
    const lines = lineFilter ? e.lines.filter((l) => lineFilter(l, e)) : e.lines;
    if (lineFilter && lines.length === 0) continue;
    const season = data.seasons.find((s) => s.id === e.seasonId);
    const entryKg = e.lines.reduce((a, l) => a + n(l.kg), 0);
    const selKg = lines.reduce((a, l) => a + n(l.kg), 0);
    const share = !lineFilter ? 1 : entryKg > 0 ? selKg / entryKg : lines.length / Math.max(1, e.lines.length);

    t.entries += 1;
    days.add(e.date);
    if (!t.firstDate || e.date < t.firstDate) t.firstDate = e.date;
    if (!t.lastDate || e.date > t.lastDate) t.lastDate = e.date;

    for (const l of lines) {
      t.bins += n(l.bins);
      t.kg += n(l.kg);
      t.oilKg += n(l.oilKg);
      t.tanks += n(lineTanks(l));
      if (has(l.kg) && has(l.oilKg) && l.kg > 0) {
        pctKg += l.kg;
        pctOil += l.oilKg;
      }
      if (has(l.kg) && has(l.bins) && l.bins > 0) {
        binKg += l.kg;
        binBins += l.bins;
      }
    }
    t.workerDays += n(e.workers) * share;
    t.workersCost += n(workersCost(e)) * share;
    const pb = pressBreakdown(e, season);
    if (pb) {
      t.pressCost += pb.gross * share;
      t.pressNet += pb.net * share;
      t.pressVat += pb.vat * share;
    }
  }
  t.days = days.size;
  t.totalCost = t.workersCost + t.pressCost;
  t.pct = pctKg > 0 ? (pctOil / pctKg) * 100 : null;
  t.kgPerBin = binBins > 0 ? binKg / binBins : null;
  t.costPerOilKg = t.oilKg > 0 && t.totalCost > 0 ? t.totalCost / t.oilKg : null;
  t.costPerKg = t.kg > 0 && t.totalCost > 0 ? t.totalCost / t.kg : null;
  return t;
}

export const sortEntries = (entries: Entry[]) =>
  [...entries].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));

import type { AppData, Entry, EntryLine, Season } from './types';

/** משקל סגולי של שמן זית (ק"ג לליטר) */
export const OIL_DENSITY = 0.916;
/** מיכל = 18 ק"ג שמן (בערך 20 ליטר) */
export const TANK_KG = 18;

const n = (v: number | null | undefined) => (typeof v === 'number' && isFinite(v) ? v : 0);
const has = (v: number | null | undefined): v is number => typeof v === 'number' && isFinite(v);

export const oilKg = (liters: number | null) => n(liters) * OIL_DENSITY;

/** אחוז שמן לפי משקל: ק"ג שמן / ק"ג זיתים */
export function oilPct(kg: number | null, liters: number | null): number | null {
  if (!has(kg) || !has(liters) || kg <= 0) return null;
  return (oilKg(liters) / kg) * 100;
}

export function autoTanks(liters: number | null): number | null {
  if (!has(liters) || liters <= 0) return null;
  // מעגלים למעלה (מיכל חלקי עדיין מיכל), עם סובלנות קטנה לעיגול
  return Math.ceil(oilKg(liters) / TANK_KG - 0.02);
}

export const lineTanks = (l: EntryLine) => (has(l.tanksOverride) ? l.tanksOverride : autoTanks(l.liters));

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

export const pressCost = (e: Entry, season: Season | undefined) =>
  has(e.pressPaidOverride) ? e.pressPaidOverride : autoPressCost(e, season);

export type Totals = {
  entries: number;
  days: number;
  bins: number;
  kg: number;
  liters: number;
  oilKg: number;
  tanks: number;
  workerDays: number;
  workersCost: number;
  pressCost: number;
  totalCost: number;
  /** אחוז שמן משוקלל (רק משורות שיש בהן גם ק"ג וגם ליטר) */
  pct: number | null;
  kgPerBin: number | null;
  costPerLiter: number | null;
  costPerKg: number | null;
  firstDate: string | null;
  lastDate: string | null;
};

export function emptyTotals(): Totals {
  return {
    entries: 0, days: 0, bins: 0, kg: 0, liters: 0, oilKg: 0, tanks: 0, workerDays: 0,
    workersCost: 0, pressCost: 0, totalCost: 0, pct: null, kgPerBin: null,
    costPerLiter: null, costPerKg: null, firstDate: null, lastDate: null,
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
      t.liters += n(l.liters);
      t.oilKg += oilKg(l.liters);
      t.tanks += n(lineTanks(l));
      if (has(l.kg) && has(l.liters) && l.kg > 0) {
        pctKg += l.kg;
        pctOil += oilKg(l.liters);
      }
      if (has(l.kg) && has(l.bins) && l.bins > 0) {
        binKg += l.kg;
        binBins += l.bins;
      }
    }
    t.workerDays += n(e.workers) * share;
    t.workersCost += n(workersCost(e)) * share;
    t.pressCost += n(pressCost(e, season)) * share;
  }
  t.days = days.size;
  t.totalCost = t.workersCost + t.pressCost;
  t.pct = pctKg > 0 ? (pctOil / pctKg) * 100 : null;
  t.kgPerBin = binBins > 0 ? binKg / binBins : null;
  t.costPerLiter = t.liters > 0 && t.totalCost > 0 ? t.totalCost / t.liters : null;
  t.costPerKg = t.kg > 0 && t.totalCost > 0 ? t.totalCost / t.kg : null;
  return t;
}

export const sortEntries = (entries: Entry[]) =>
  [...entries].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));

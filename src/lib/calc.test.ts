import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoTanks, oilPct, summarize, pressCost, pressBreakdown, kgPerBin } from './calc.ts';
import { fmt, parseNum, addDays } from './format.ts';
import type { Entry, Season } from './types.ts';

const season: Season = { id: 's', name: 'מסיק 2026', pricePerKg: 0.5, pricePerTank: 10, vatRate: 0, pricesIncludeVat: false, createdAt: '' };
const e1: Entry = {
  id: 'e1', seasonId: 's', date: '2026-10-20', plotId: 'p12', workers: 4, costPerWorker: 400, notes: '', pressPaidOverride: null, pressPaidIncludesVat: true,
  lines: [
    { varietyId: 'barnea', bins: 10, kg: 4000, oilKg: 733, tanksOverride: null },
    { varietyId: 'picual', bins: 5, kg: 1000, oilKg: 183, tanksOverride: 11 },
  ],
};
const e2: Entry = { ...e1, id: 'e2', date: '2026-10-22', plotId: 'p200', pressPaidOverride: 1000,
  lines: [{ varietyId: 'barnea', bins: 2, kg: 1000, oilKg: 137, tanksOverride: null }] };

test('oil percent = oil kg / olive kg', () => {
  assert.equal(oilPct(1000, 183), 18.3);
  assert.equal(oilPct(0, 200), null);
  assert.equal(oilPct(1000, null), null);
});

test('tanks: 18kg oil each, rounded up', () => {
  assert.equal(autoTanks(733), 41); // 733 / 18 = 40.7
  assert.equal(autoTanks(18), 1);
  assert.equal(autoTanks(36.1), 2); // סובלנות קטנה לעיגול
  assert.equal(autoTanks(37), 3);
  assert.equal(autoTanks(null), null);
});

test('press cost auto and override', () => {
  // 5000kg*0.5 + (41+11)*10
  assert.equal(pressCost(e1, season), 2500 + 520);
  assert.equal(pressCost(e2, season), 1000);
});

test('VAT on olive press', () => {
  const vatSeason = { ...season, vatRate: 18 };
  // מחירים לפני מע״מ: 3020 + 18%
  const a = pressBreakdown(e1, vatSeason)!;
  assert.equal(a.net, 3020);
  assert.equal(a.gross.toFixed(2), '3563.60');
  // מחירים כוללים מע״מ
  const b = pressBreakdown(e1, { ...vatSeason, pricesIncludeVat: true })!;
  assert.equal(b.gross, 3020);
  assert.equal(b.net.toFixed(2), (3020 / 1.18).toFixed(2));
  // סכום ידני כולל מע״מ / לפני מע״מ
  assert.equal(pressBreakdown(e2, vatSeason)!.gross, 1000);
  assert.equal(pressBreakdown({ ...e2, pressPaidIncludesVat: false }, vatSeason)!.gross.toFixed(2), '1180.00');
  const t = summarize({ seasons: [vatSeason] }, [e1]);
  assert.equal(t.pressCost.toFixed(2), '3563.60');
  assert.equal(t.totalCost.toFixed(2), (3563.6 + 1600).toFixed(2));
});

test('summarize totals and per variety cost split', () => {
  const d = { seasons: [season] };
  const t = summarize(d, [e1, e2]);
  assert.equal(t.kg, 6000);
  assert.equal(t.oilKg, 733 + 183 + 137);
  assert.equal(t.days, 2);
  assert.equal(t.workersCost, 3200);
  assert.equal(t.pressCost, 3020 + 1000);
  assert.equal(t.kgPerBin!.toFixed(1), (6000 / 17).toFixed(1));
  const b = summarize(d, [e1, e2], (l) => l.varietyId === 'barnea');
  assert.equal(b.kg, 5000);
  // e1: barnea is 80% of the kg → 80% of 1600 + all of e2's 1600
  assert.equal(b.workersCost, 1280 + 1600);
  assert.equal(kgPerBin(4000, 10), 400);
});

test('format helpers', () => {
  assert.equal(fmt(12345.678, 1), '12,345.7');
  assert.equal(fmt(1000, 1), '1,000');
  assert.equal(fmt(null), '—');
  assert.equal(parseNum('12,5'), 12.5);
  assert.equal(parseNum(''), null);
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
});

test('default date for a new harvest day', async () => {
  const { yearFromName, defaultEntryDate } = await import('./format.ts');
  assert.equal(yearFromName('מסיק 2018'), 2018);
  assert.equal(yearFromName('2021 חלקה 12'), 2021);
  assert.equal(yearFromName('מסיק'), null);
  assert.equal(yearFromName('מסיק 12345'), null);
  const today = '2026-11-11';
  assert.equal(defaultEntryDate('מסיק 2026', [], today), today);
  assert.equal(defaultEntryDate('המסיק שלי', ['2025-10-01'], today), today);
  assert.equal(defaultEntryDate('מסיק 2018', [], today), '2018-10-01');
  assert.equal(defaultEntryDate('מסיק 2018', ['2018-10-20', '2018-11-03', '2018-10-25'], today), '2018-11-03');
});

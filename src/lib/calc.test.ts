import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoTanks, oilPct, summarize, pressCost, kgPerBin } from './calc.ts';
import { fmt, parseNum, addDays } from './format.ts';
import type { Entry, Season } from './types.ts';

const season: Season = { id: 's', name: 'מסיק 2026', pricePerKg: 0.5, pricePerTank: 10, createdAt: '' };
const e1: Entry = {
  id: 'e1', seasonId: 's', date: '2026-10-20', plotId: 'p12', workers: 4, costPerWorker: 400, notes: '', pressPaidOverride: null,
  lines: [
    { varietyId: 'barnea', bins: 10, kg: 4000, liters: 800, tanksOverride: null },
    { varietyId: 'picual', bins: 5, kg: 1000, liters: 200, tanksOverride: 11 },
  ],
};
const e2: Entry = { ...e1, id: 'e2', date: '2026-10-22', plotId: 'p200', pressPaidOverride: 1000,
  lines: [{ varietyId: 'barnea', bins: 2, kg: 1000, liters: 150, tanksOverride: null }] };

test('oil percent is by weight', () => {
  assert.equal(oilPct(1000, 200)!.toFixed(2), '18.32');
  assert.equal(oilPct(0, 200), null);
  assert.equal(oilPct(1000, null), null);
});

test('tanks: 18kg oil each, rounded up', () => {
  assert.equal(autoTanks(800), 41); // 732.8kg / 18 = 40.7
  assert.equal(autoTanks(19.65), 1);
  assert.equal(autoTanks(null), null);
});

test('press cost auto and override', () => {
  // 5000kg*0.5 + (41+11)*10
  assert.equal(pressCost(e1, season), 2500 + 520);
  assert.equal(pressCost(e2, season), 1000);
});

test('summarize totals and per variety cost split', () => {
  const d = { seasons: [season] };
  const t = summarize(d, [e1, e2]);
  assert.equal(t.kg, 6000);
  assert.equal(t.liters, 1150);
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

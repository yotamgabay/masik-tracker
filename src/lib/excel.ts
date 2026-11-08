import * as XLSX from 'xlsx';
import { kgPerBin, lineTanks, oilPct, pressBreakdown, sortEntries, summarize, workersCost } from './calc';
import { fmtDate, todayISO } from './format';
import { nameOf } from './store';
import type { AppData, Season } from './types';
import { shareFile } from './files';

const r1 = (v: number | null | undefined) => (v == null ? null : Math.round(v * 10) / 10);
const r0 = (v: number | null | undefined) => (v == null ? null : Math.round(v));

/** בונה קובץ אקסל עם כל הנתונים (מסיק אחד או כולם) ומשתף אותו */
export async function exportExcel(data: AppData, season?: Season) {
  const seasons = season ? [season] : data.seasons;
  const sIds = new Set(seasons.map((s) => s.id));
  const entries = sortEntries(data.entries.filter((e) => sIds.has(e.seasonId)));
  const sName = (id: string) => data.seasons.find((s) => s.id === id)?.name ?? '';

  // גיליון 1: כל השורות (יום × סוג)
  const rows: Record<string, unknown>[] = [];
  for (const e of entries) {
    e.lines.forEach((l, i) => {
      const pb = i === 0 ? pressBreakdown(e, data.seasons.find((s) => s.id === e.seasonId)) : null;
      rows.push({
        'מסיק': sName(e.seasonId),
        'תאריך': fmtDate(e.date),
        'חלקה': nameOf(data.plots, e.plotId),
        'סוג זית': nameOf(data.varieties, l.varietyId),
        'דולבים': l.bins,
        'ק״ג זיתים': l.kg,
        'ק״ג שמן': l.oilKg,
        'מיכלים': lineTanks(l),
        'אחוז שמן': r1(oilPct(l.kg, l.oilKg)),
        'ק״ג לדולב': r1(kgPerBin(l.kg, l.bins)),
        // עלויות היום מופיעות רק בשורה הראשונה של היום כדי שסכום העמודה יהיה נכון
        'פועלים': i === 0 ? e.workers : null,
        'עלות לפועל': i === 0 ? e.costPerWorker : null,
        'עלות פועלים': i === 0 ? workersCost(e) : null,
        'בית הבד לפני מע״מ': pb ? r0(pb.net) : null,
        'מע״מ': pb ? r0(pb.vat) : null,
        'בית הבד כולל מע״מ': pb ? r0(pb.gross) : null,
        'הערות': i === 0 ? e.notes : '',
      });
    });
  }

  const summaryRow = (label: string, key: string, t: ReturnType<typeof summarize>) => ({
    [label]: key,
    'ימי מסיק': t.days,
    'דולבים': t.bins,
    'ק״ג זיתים': r0(t.kg),
    'ק״ג שמן': r0(t.oilKg),
    'מיכלים': t.tanks,
    'אחוז שמן': r1(t.pct),
    'ק״ג לדולב': r1(t.kgPerBin),
    'ימי עבודה': r1(t.workerDays),
    'עלות פועלים': r0(t.workersCost),
    'בית הבד לפני מע״מ': r0(t.pressNet),
    'מע״מ': r0(t.pressVat),
    'בית הבד כולל מע״מ': r0(t.pressCost),
    'עלות כוללת (כולל מע״מ)': r0(t.totalCost),
    'עלות לק״ג שמן': r1(t.costPerOilKg),
  });

  const bySeason = seasons.map((s) => summaryRow('מסיק', s.name, summarize(data, entries.filter((e) => e.seasonId === s.id))));
  const varIds = [...new Set(entries.flatMap((e) => e.lines.map((l) => l.varietyId)))];
  const byVariety = varIds.map((v) => summaryRow('סוג זית', nameOf(data.varieties, v), summarize(data, entries, (l) => l.varietyId === v)));
  const plotIds = [...new Set(entries.map((e) => e.plotId))];
  const byPlot = plotIds.map((p) => summaryRow('חלקה', nameOf(data.plots, p), summarize(data, entries.filter((e) => e.plotId === p))));
  const byPlotVariety = plotIds.flatMap((p) =>
    varIds
      .map((v) => summaryRow('חלקה + סוג', `${nameOf(data.plots, p)} – ${nameOf(data.varieties, v)}`,
        summarize(data, entries, (l, e) => e.plotId === p && l.varietyId === v)))
      .filter((r) => (r['ימי מסיק'] as number) > 0),
  );

  const wb = XLSX.utils.book_new();
  const add = (name: string, data: Record<string, unknown>[]) => {
    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ '': 'אין נתונים' }]);
    const keys = Object.keys(data[0] ?? {});
    ws['!cols'] = keys.map((k) => ({ wch: Math.max(10, k.length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  add('סיכום', bySeason);
  add('לפי סוג', byVariety);
  add('לפי חלקה', byPlot);
  add('חלקה וסוג', byPlotVariety);
  add('כל הרשומות', rows);
  // גיליונות מימין לשמאל
  wb.Workbook = { Views: [{ RTL: true }] };

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const fileName = `${season ? season.name : 'כל המסיקים'} ${todayISO()}.xlsx`.replace(/[\\/:*?"<>|]/g, '-');
  await shareFile(fileName, new Uint8Array(out), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}


import { lineTanks, oilPct, summarize, workersCost, pressBreakdown, kgPerBin } from './calc';
import { fmt, fmtDate, fmtMoney, fmtPct, weekday } from './format';
import { nameOf } from './store';
import type { AppData, Entry, Season } from './types';

/** הודעת סיכום מסיק לוואטסאפ (כוכביות = מודגש בוואטסאפ) */
export function seasonSummaryText(data: AppData, season: Season): string {
  const entries = data.entries.filter((e) => e.seasonId === season.id);
  const t = summarize(data, entries);
  const L: string[] = [];
  L.push(`🫒 *סיכום ${season.name}*`);
  if (t.firstDate) {
    L.push(`📅 ${fmtDate(t.firstDate)} – ${fmtDate(t.lastDate)} (${t.days} ימי מסיק)`);
  }
  L.push('');
  L.push('*סה״כ*');
  L.push(`• זיתים: ${fmt(t.kg)} ק״ג (${fmt(t.bins)} דולבים)`);
  L.push(`• שמן: ${fmt(t.oilKg)} ק״ג (${fmt(t.tanks)} מיכלים)`);
  L.push(`• אחוז שמן ממוצע: ${fmtPct(t.pct)}`);
  if (t.kgPerBin) L.push(`• ממוצע לדולב: ${fmt(t.kgPerBin)} ק״ג`);

  const varIds = [...new Set(entries.flatMap((e) => e.lines.map((l) => l.varietyId)))];
  if (varIds.length) {
    L.push('');
    L.push('*לפי סוג זית*');
    for (const vid of varIds) {
      const v = summarize(data, entries, (l) => l.varietyId === vid);
      L.push(`• ${nameOf(data.varieties, vid)}: ${fmt(v.kg)} ק״ג זיתים ← ${fmt(v.oilKg)} ק״ג שמן (${fmtPct(v.pct)})`);
    }
  }

  const plotIds = [...new Set(entries.map((e) => e.plotId))];
  if (plotIds.length > 1) {
    L.push('');
    L.push('*לפי חלקה*');
    for (const pid of plotIds) {
      const p = summarize(data, entries.filter((e) => e.plotId === pid));
      L.push(`• ${nameOf(data.plots, pid)}: ${fmt(p.kg)} ק״ג זיתים ← ${fmt(p.oilKg)} ק״ג שמן (${fmtPct(p.pct)})`);
    }
  }

  if (t.totalCost > 0) {
    L.push('');
    L.push('💰 *עלויות*');
    if (t.workersCost > 0) L.push(`• פועלים: ${fmtMoney(t.workersCost)} (${fmt(t.workerDays)} ימי עבודה)`);
    if (t.pressCost > 0) {
      L.push(`• בית הבד: ${fmtMoney(t.pressCost)} כולל מע״מ`);
      L.push(`   (${fmtMoney(t.pressNet)} + מע״מ ${fmtMoney(t.pressVat)})`);
    }
    L.push(`• סה״כ: ${fmtMoney(t.totalCost)}`);
    if (t.costPerOilKg) L.push(`• עלות לק״ג שמן: ${fmt(t.costPerOilKg, 1)} ₪`);
  }
  return L.join('\n');
}

/** סיכום של יום מסיק אחד */
export function entrySummaryText(data: AppData, e: Entry): string {
  const season = data.seasons.find((s) => s.id === e.seasonId);
  const L: string[] = [];
  L.push(`🫒 *מסיק ${weekday(e.date)} ${fmtDate(e.date)}* – ${nameOf(data.plots, e.plotId)}`);
  for (const l of e.lines) {
    L.push('');
    L.push(`*${nameOf(data.varieties, l.varietyId)}*`);
    if (l.bins != null) L.push(`• ${fmt(l.bins)} דולבים${kgPerBin(l.kg, l.bins) ? ` (${fmt(kgPerBin(l.kg, l.bins))} ק״ג לדולב)` : ''}`);
    if (l.kg != null) L.push(`• ${fmt(l.kg)} ק״ג זיתים`);
    if (l.oilKg != null) L.push(`• ${fmt(l.oilKg)} ק״ג שמן (${fmt(lineTanks(l))} מיכלים)`);
    const p = oilPct(l.kg, l.oilKg);
    if (p != null) L.push(`• אחוז שמן: ${fmtPct(p)}`);
  }
  const wc = workersCost(e);
  const pb = pressBreakdown(e, season);
  const pc = pb?.gross;
  if (wc || pc) {
    L.push('');
    if (wc) L.push(`👷 פועלים: ${fmt(e.workers)} × ${fmt(e.costPerWorker)} = ${fmtMoney(wc)}`);
    if (pb && pc) L.push(`🏭 בית הבד: ${fmtMoney(pc)} כולל מע״מ (${fmtMoney(pb.net)} + מע״מ ${fmtMoney(pb.vat)})`);
  }
  if (e.notes) {
    L.push('');
    L.push(`📝 ${e.notes}`);
  }
  return L.join('\n');
}

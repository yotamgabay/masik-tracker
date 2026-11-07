import { DEFAULT_VAT, kgPerBin, lineTanks, oilPct, pressBreakdown, sortEntries, summarize, workersCost, type Totals } from './calc';
import { fmt, fmtDate, todayISO, weekday } from './format';
import { nameOf } from './store';
import type { AppData } from './types';

const tot = (t: Totals) =>
  [
    `ימי מסיק ${t.days}`,
    `דולבים ${fmt(t.bins)}`,
    `זיתים ${fmt(t.kg)} ק"ג`,
    `שמן ${fmt(t.liters)} ליטר`,
    `מיכלים ${fmt(t.tanks)}`,
    `אחוז שמן ${t.pct == null ? 'לא ידוע' : fmt(t.pct, 1) + '%'}`,
    t.kgPerBin ? `ק"ג לדולב ${fmt(t.kgPerBin)}` : null,
    t.workersCost ? `עלות פועלים ${fmt(t.workersCost)} ₪ (${fmt(t.workerDays, 1)} ימי עבודה)` : null,
    t.pressCost ? `בית הבד ${fmt(t.pressCost)} ₪ כולל מע"מ (${fmt(t.pressNet)} לפני מע"מ)` : null,
    t.totalCost ? `עלות כוללת ${fmt(t.totalCost)} ₪` : null,
    t.costPerLiter ? `עלות לליטר ${fmt(t.costPerLiter, 1)} ₪` : null,
  ]
    .filter(Boolean)
    .join(' | ');

/** כל נתוני המסיקים כטקסט, בשביל העוזר */
export function buildDataContext(data: AppData): string {
  const L: string[] = [];
  L.push(`סוגי זיתים: ${data.varieties.map((v) => v.name).join(', ') || 'אין'}`);
  L.push(`חלקות: ${data.plots.map((p) => p.name).join(', ') || 'אין'}`);
  if (data.seasons.length === 0) L.push('עדיין לא נשמרו מסיקים.');

  for (const s of data.seasons) {
    const entries = sortEntries(data.entries.filter((e) => e.seasonId === s.id));
    L.push('');
    L.push(`## ${s.name}`);
    L.push(
      `מחירי בית הבד: ${s.pricePerKg ?? 'לא הוגדר'} ₪ לק"ג זיתים, ${s.pricePerTank ?? 'לא הוגדר'} ₪ למיכל, ` +
        `${s.pricesIncludeVat ? 'כולל' : 'לפני'} מע"מ ${s.vatRate ?? DEFAULT_VAT}%`,
    );
    if (entries.length === 0) {
      L.push('אין ימי מסיק.');
      continue;
    }
    L.push(`סה"כ: ${tot(summarize(data, entries))}`);
    const varIds = [...new Set(entries.flatMap((e) => e.lines.map((l) => l.varietyId)))];
    const plotIds = [...new Set(entries.map((e) => e.plotId))];
    for (const v of varIds) L.push(`לפי סוג – ${nameOf(data.varieties, v)}: ${tot(summarize(data, entries, (l) => l.varietyId === v))}`);
    for (const p of plotIds) L.push(`לפי חלקה – ${nameOf(data.plots, p)}: ${tot(summarize(data, entries.filter((e) => e.plotId === p)))}`);
    for (const p of plotIds)
      for (const v of varIds) {
        const t = summarize(data, entries, (l, e) => e.plotId === p && l.varietyId === v);
        if (t.entries) L.push(`חלקה+סוג – ${nameOf(data.plots, p)} / ${nameOf(data.varieties, v)}: ${tot(t)}`);
      }
    L.push('ימי מסיק:');
    for (const e of entries) {
      const lines = e.lines
        .map((l) => {
          const pct = oilPct(l.kg, l.liters);
          const kb = kgPerBin(l.kg, l.bins);
          return `${nameOf(data.varieties, l.varietyId)}: ${l.bins ?? '?'} דולבים, ${l.kg ?? '?'} ק"ג, ${l.liters ?? '?'} ליטר, ${lineTanks(l) ?? '?'} מיכלים` +
            (pct != null ? `, ${fmt(pct, 1)}%` : '') + (kb ? `, ${fmt(kb)} ק"ג לדולב` : '');
        })
        .join('; ');
      const wc = workersCost(e);
      const pb = pressBreakdown(e, s);
      L.push(
        `- ${weekday(e.date)} ${fmtDate(e.date)}, ${nameOf(data.plots, e.plotId)}: ${lines}` +
          (e.workers != null ? ` | ${e.workers} פועלים × ${e.costPerWorker ?? '?'} ₪${wc ? ` = ${fmt(wc)} ₪` : ''}` : '') +
          (pb ? ` | בית הבד ${fmt(pb.gross)} ₪ כולל מע"מ` : '') +
          (e.notes ? ` | הערה: ${e.notes}` : ''),
      );
    }
  }
  return L.join('\n');
}

export function systemPrompt(data: AppData): string {
  return `אתה עוזר במסיק זיתים, בתוך אפליקציה של חקלאי מישראל שמגדל זיתים ושומר בה את נתוני המסיק שלו. המשתמש אינו טכנולוגי.

איך לענות:
- תמיד בעברית פשוטה, קצרה וברורה, כמו שמדברים. כמה שורות בדרך כלל מספיקות.
- בלי Markdown: בלי כוכביות, בלי # ובלי טבלאות. לרשימה אפשר לפתוח שורות ב-"•".
- כשאתה מסתמך על הנתונים שלו, תן את המספרים המדויקים מהנתונים למטה, ואל תמציא מספרים. אם חסר נתון, אמור את זה.
- על שאלות כלליות (זנים, מועד קטיף, השקיה, מזיקים, איכות שמן, שוק) ענה מהידע שלך, בזהירות, והבהר כשמשהו תלוי באזור, בשנה או במומחה מקומי.

הגדרות באפליקציה:
- אחוז שמן מחושב לפי משקל: ליטר שמן × 0.916 ÷ ק"ג זיתים.
- מיכל שמן = 18 ק"ג שמן (בערך 20 ליטר).
- "דולב" = מכל איסוף זיתים מהשטח.
- עלות בית הבד כוללת מע"מ. עלות כוללת = פועלים + בית הבד.
- כשיש כמה סוגים באותו יום, עלויות היום מתחלקות בין הסוגים לפי המשקל.

נתוני המסיקים שלו:
${buildDataContext(data)}

התאריך היום: ${fmtDate(todayISO())}.`;
}

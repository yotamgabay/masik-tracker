import { useState } from 'react';
import { Text, View } from 'react-native';
import { Btn, Card, Chips, H, Muted, Row, Screen, Stat, StatGrid, notify } from '../components/ui';
import { C } from '../components/theme';
import { sortEntries, summarize, type Totals } from '../lib/calc';
import { exportExcel } from '../lib/excel';
import { fmt, fmtDate, fmtMoney, fmtPct, weekday } from '../lib/format';
import { nameOf, useData } from '../lib/store';
import type { Entry, EntryLine } from '../lib/types';

type GroupBy = 'variety' | 'plot' | 'plotVariety' | 'season' | 'day';
const GROUPS: { id: GroupBy; name: string }[] = [
  { id: 'variety', name: 'סוג זית' },
  { id: 'plot', name: 'חלקה' },
  { id: 'plotVariety', name: 'חלקה + סוג' },
  { id: 'season', name: 'מסיק (שנה)' },
  { id: 'day', name: 'יום' },
];

type Group = { key: string; title: string; t: Totals };

export default function Stats() {
  const { data } = useData();
  const [seasonId, setSeasonId] = useState<string>(data.seasons.length ? 'all' : 'all');
  const [groupBy, setGroupBy] = useState<GroupBy>('variety');
  const [varietyFilter, setVarietyFilter] = useState<string>('all');
  const [plotFilter, setPlotFilter] = useState<string>('all');

  const lineFilter =
    varietyFilter === 'all' ? undefined : (l: EntryLine) => l.varietyId === varietyFilter;
  const entries = sortEntries(
    data.entries.filter((e) => (seasonId === 'all' || e.seasonId === seasonId) && (plotFilter === 'all' || e.plotId === plotFilter)),
  );
  const total = summarize(data, entries, lineFilter);

  const groups: Group[] = (() => {
    const both = (extra?: (l: EntryLine, e: Entry) => boolean) =>
      lineFilter || extra ? (l: EntryLine, e: Entry) => (!lineFilter || lineFilter(l)) && (!extra || extra(l, e)) : undefined;
    const varIds = [...new Set(entries.flatMap((e) => e.lines.map((l) => l.varietyId)))];
    const plotIds = [...new Set(entries.map((e) => e.plotId))];
    switch (groupBy) {
      case 'variety':
        return varIds.map((v) => ({ key: v, title: nameOf(data.varieties, v), t: summarize(data, entries, both((l) => l.varietyId === v)) }));
      case 'plot':
        return plotIds.map((p) => ({ key: p, title: nameOf(data.plots, p), t: summarize(data, entries.filter((e) => e.plotId === p), both()) }));
      case 'plotVariety':
        return plotIds.flatMap((p) =>
          varIds.map((v) => ({
            key: `${p}-${v}`,
            title: `${nameOf(data.plots, p)} · ${nameOf(data.varieties, v)}`,
            t: summarize(data, entries, both((l, e) => e.plotId === p && l.varietyId === v)),
          })),
        );
      case 'season':
        return data.seasons
          .filter((s) => seasonId === 'all' || s.id === seasonId)
          .map((s) => ({ key: s.id, title: s.name, t: summarize(data, entries.filter((e) => e.seasonId === s.id), both()) }));
      case 'day':
        return [...entries].reverse().map((e) => ({
          key: e.id,
          title: `${weekday(e.date)} ${fmtDate(e.date)} · ${nameOf(data.plots, e.plotId)}`,
          t: summarize(data, [e], both()),
        }));
    }
  })().filter((g) => g.t.entries > 0);

  const maxKg = Math.max(1, ...groups.map((g) => g.t.kg));
  const pcts = groups.map((g) => g.t.pct).filter((p): p is number => p != null);
  const bestPct = pcts.length > 1 ? Math.max(...pcts) : null;

  const seasonOpts = [{ id: 'all', name: 'כל המסיקים' }, ...data.seasons.map((s) => ({ id: s.id, name: s.name }))];
  const varOpts = [{ id: 'all', name: 'כל הסוגים' }, ...data.varieties.map((v) => ({ id: v.id, name: v.name }))];
  const plotOpts = [{ id: 'all', name: 'כל החלקות' }, ...data.plots.map((p) => ({ id: p.id, name: p.name }))];

  return (
    <Screen>
      <Card>
        <Muted>מסיק</Muted>
        <Chips options={seasonOpts} selected={[seasonId]} onToggle={setSeasonId} />
        <Muted>חלקה</Muted>
        <Chips options={plotOpts} selected={[plotFilter]} onToggle={setPlotFilter} />
        <Muted>סוג זית</Muted>
        <Chips options={varOpts} selected={[varietyFilter]} onToggle={setVarietyFilter} />
      </Card>

      <H>סה״כ</H>
      {total.entries === 0 ? (
        <Muted>אין נתונים לסינון הזה.</Muted>
      ) : (
        <StatGrid>
          <Stat label="ק״ג זיתים" value={fmt(total.kg)} />
          <Stat label="ליטר שמן" value={fmt(total.liters)} />
          <Stat label="אחוז שמן" value={fmtPct(total.pct)} highlight />
          <Stat label="ק״ג לדולב" value={fmt(total.kgPerBin)} />
          <Stat label="ימי מסיק" value={fmt(total.days)} />
          <Stat label="ימי עבודה (פועלים)" value={fmt(total.workerDays, 1)} />
          <Stat label="עלות כוללת" value={fmtMoney(total.totalCost)} />
          <Stat label="עלות לליטר" value={total.costPerLiter ? `${fmt(total.costPerLiter, 1)} ₪` : '—'} highlight />
        </StatGrid>
      )}

      <H>חלוקה לפי</H>
      <Chips options={GROUPS} selected={[groupBy]} onToggle={setGroupBy} />

      {groups.map((g) => (
        <Card key={g.key} style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, flexShrink: 1 }}>{g.title}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.primary }}>
              {fmtPct(g.t.pct)}{bestPct != null && g.t.pct === bestPct ? ' 🏆' : ''}
            </Text>
          </Row>
          <View style={{ height: 8, backgroundColor: C.primarySoft, borderRadius: 4 }}>
            <View style={{ height: 8, width: `${(g.t.kg / maxKg) * 100}%`, backgroundColor: C.accent, borderRadius: 4 }} />
          </View>
          <Row style={{ gap: 14 }}>
            <Muted>{fmt(g.t.kg)} ק״ג</Muted>
            <Muted>{fmt(g.t.liters)} ליטר</Muted>
            <Muted>{fmt(g.t.bins)} דולבים</Muted>
            {g.t.kgPerBin ? <Muted>{fmt(g.t.kgPerBin)} ק״ג לדולב</Muted> : null}
          </Row>
          {g.t.totalCost > 0 ? (
            <Row style={{ gap: 14 }}>
              <Muted>💰 {fmtMoney(g.t.totalCost)}</Muted>
              {g.t.costPerLiter ? <Muted>{fmt(g.t.costPerLiter, 1)} ₪ לליטר</Muted> : null}
              {groupBy !== 'day' ? <Muted>{g.t.days} ימים</Muted> : null}
            </Row>
          ) : null}
        </Card>
      ))}

      {varietyFilter !== 'all' || groupBy === 'variety' || groupBy === 'plotVariety' ? (
        <Muted>💡 כשיש כמה סוגים באותו יום, עלות הפועלים ובית הבד מתחלקת ביניהם לפי המשקל.</Muted>
      ) : null}

      <Btn
        title="📊 ייצוא הכל לאקסל"
        variant="secondary"
        onPress={() =>
          exportExcel(data, seasonId === 'all' ? undefined : data.seasons.find((s) => s.id === seasonId)).catch((e) =>
            notify('הייצוא נכשל', String(e)),
          )
        }
      />
    </Screen>
  );
}

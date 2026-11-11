import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Btn, Card, Chips, Computed, Field, H, MoneyLine, Muted, NameModal, Row, Screen, Segmented, confirm, notify } from '../../components/ui';
import { C } from '../../components/theme';
import { autoPressCost, autoTanks, kgPerBin, lineTanks, oilPct, pressBreakdown, workersCost } from '../../lib/calc';
import { addDays, defaultEntryDate, fmt, fmtDate, fmtMoney, fmtPct, numToStr, parseNum, todayISO, uid, weekday } from '../../lib/format';
import { DatePicker } from '../../components/DatePicker';
import { sendToWhatsApp } from '../../lib/share';
import { nameOf, useData } from '../../lib/store';
import { entrySummaryText } from '../../lib/summary';
import type { Entry, EntryLine } from '../../lib/types';

type LineForm = { varietyId: string; bins: string; kg: string; oilKg: string; tanks: string };

const toLine = (f: LineForm): EntryLine => ({
  varietyId: f.varietyId,
  bins: parseNum(f.bins),
  kg: parseNum(f.kg),
  oilKg: parseNum(f.oilKg),
  tanksOverride: parseNum(f.tanks),
});

export default function EntryEdit() {
  const { seasonId, id } = useLocalSearchParams<{ seasonId: string; id?: string }>();
  const { data, saveEntry, deleteEntry, addNamed } = useData();
  const season = data.seasons.find((s) => s.id === seasonId);
  const existing = data.entries.find((e) => e.id === id);
  const lastInSeason = useMemo(
    () => [...data.entries].filter((e) => e.seasonId === seasonId).sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [date, setDate] = useState(
    () =>
      existing?.date ??
      defaultEntryDate(season?.name ?? '', data.entries.filter((e) => e.seasonId === seasonId).map((e) => e.date)),
  );
  const [pickingDate, setPickingDate] = useState(false);
  const [plotId, setPlotId] = useState(existing?.plotId ?? lastInSeason?.plotId ?? '');
  const [workers, setWorkers] = useState(numToStr(existing?.workers));
  const [costPerWorker, setCostPerWorker] = useState(numToStr(existing ? existing.costPerWorker : data.lastCostPerWorker));
  const [pressPaid, setPressPaid] = useState(numToStr(existing?.pressPaidOverride));
  const [paidInclVat, setPaidInclVat] = useState<'incl' | 'excl'>(existing?.pressPaidIncludesVat === false ? 'excl' : 'incl');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [lines, setLines] = useState<LineForm[]>(
    existing?.lines.map((l) => ({
      varietyId: l.varietyId, bins: numToStr(l.bins), kg: numToStr(l.kg), oilKg: numToStr(l.oilKg), tanks: numToStr(l.tanksOverride),
    })) ?? [],
  );
  const [adding, setAdding] = useState<null | 'varieties' | 'plots'>(null);

  const visible = (kind: 'varieties' | 'plots', selected: string[]) =>
    data[kind].filter((x) => !x.archived || selected.includes(x.id));

  const toggleVariety = (vid: string) =>
    setLines((ls) =>
      ls.some((l) => l.varietyId === vid)
        ? ls.filter((l) => l.varietyId !== vid)
        : [...ls, { varietyId: vid, bins: '', kg: '', oilKg: '', tanks: '' }],
    );
  const setLine = (vid: string, patch: Partial<LineForm>) =>
    setLines((ls) => ls.map((l) => (l.varietyId === vid ? { ...l, ...patch } : l)));

  const build = (): Entry => ({
    id: existing?.id ?? uid(),
    seasonId: seasonId!,
    date,
    plotId,
    workers: parseNum(workers),
    costPerWorker: parseNum(costPerWorker),
    lines: lines.map(toLine),
    pressPaidOverride: parseNum(pressPaid),
    pressPaidIncludesVat: paidInclVat === 'incl',
    notes: notes.trim(),
  });

  const draft = build();
  const wc = workersCost(draft);
  const autoPress = autoPressCost(draft, season);
  const pb = pressBreakdown(draft, season);
  const press = pb?.gross ?? null;
  const totalOil = draft.lines.reduce((a, l) => a + (l.oilKg ?? 0), 0);
  const totalKg = draft.lines.reduce((a, l) => a + (l.kg ?? 0), 0);
  const totalCost = (wc ?? 0) + (press ?? 0);

  const save = () => {
    if (!plotId) return notify('בחר חלקה');
    if (lines.length === 0) return notify('בחר לפחות סוג זית אחד');
    saveEntry(draft);
    router.back();
  };

  if (!season) return <Screen><Muted>המסיק לא נמצא</Muted></Screen>;

  return (
    <Screen
      footer={
        <Row>
          <Btn title="💾 שמור" style={{ flex: 2 }} onPress={save} />
          {existing ? (
            <Btn title="📲 שלח" variant="whatsapp" style={{ flex: 1 }} onPress={() => sendToWhatsApp(entrySummaryText(data, draft))} />
          ) : null}
        </Row>
      }
    >
      <Stack.Screen options={{ title: existing ? 'עריכת יום מסיק' : 'יום מסיק חדש' }} />

      {/* תאריך */}
      <Card>
        <H>📅 תאריך</H>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Btn title="יום קודם" small variant="secondary" onPress={() => setDate(addDays(date, -1))} />
          <Pressable
            onPress={() => setPickingDate(true)}
            accessibilityRole="button"
            accessibilityLabel="בחירת תאריך"
            style={{ alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.primarySoft }}
          >
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>📅 {fmtDate(date)}</Text>
            <Text style={{ fontSize: 15, color: C.muted }}>יום {weekday(date)}{date === todayISO() ? ' (היום)' : ''}</Text>
          </Pressable>
          <Btn title="יום הבא" small variant="secondary" onPress={() => setDate(addDays(date, 1))} />
        </View>
        <Muted>לחץ על התאריך כדי לבחור מלוח שנה</Muted>
        <DatePicker visible={pickingDate} value={date} onChange={setDate} onClose={() => setPickingDate(false)} />
      </Card>

      {/* חלקה */}
      <Card>
        <H>📍 חלקה</H>
        <Chips
          options={visible('plots', [plotId])}
          selected={[plotId]}
          onToggle={setPlotId}
          onAdd={() => setAdding('plots')}
          addLabel="+ חלקה חדשה"
        />
      </Card>

      {/* סוגי זיתים */}
      <Card>
        <H>🫒 סוגי זיתים שנקטפו</H>
        <Chips
          options={visible('varieties', lines.map((l) => l.varietyId))}
          selected={lines.map((l) => l.varietyId)}
          onToggle={toggleVariety}
          onAdd={() => setAdding('varieties')}
          addLabel="+ סוג חדש"
        />
      </Card>

      {lines.map((l) => {
        const line = toLine(l);
        const pct = oilPct(line.kg, line.oilKg);
        const auto = autoTanks(line.oilKg);
        return (
          <Card key={l.varietyId} style={{ borderColor: C.primary, borderWidth: 1.5 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <H>{nameOf(data.varieties, l.varietyId)}</H>
              <Pressable onPress={() => toggleVariety(l.varietyId)} hitSlop={10}>
                <Text style={{ color: C.danger, fontSize: 15 }}>הסר</Text>
              </Pressable>
            </Row>
            <Row>
              <Field label="דולבים מהשטח" value={l.bins} onChange={(v) => setLine(l.varietyId, { bins: v })} />
              <Field label="משקל זיתים בבית הבד" suffix="ק״ג" value={l.kg} onChange={(v) => setLine(l.varietyId, { kg: v })} />
            </Row>
            <Row>
              <Field label="שמן שיצא" suffix="ק״ג" value={l.oilKg} onChange={(v) => setLine(l.varietyId, { oilKg: v })} />
              <Field
                label="מיכלים"
                value={l.tanks}
                onChange={(v) => setLine(l.varietyId, { tanks: v })}
                placeholder={auto != null ? String(auto) : ''}
                hint={l.tanks ? 'הוזן ידנית' : 'מתמלא לבד (18 ק״ג למיכל)'}
              />
            </Row>
            <Row>
              <Computed label="אחוז שמן" value={fmtPct(pct)} big />
              <Computed label="ק״ג לדולב" value={fmt(kgPerBin(line.kg, line.bins))} />
            </Row>
          </Card>
        );
      })}

      {/* פועלים */}
      <Card>
        <H>👷 פועלים</H>
        <Row>
          <Field label="כמה פועלים" value={workers} onChange={setWorkers} />
          <Field label="עלות לפועל ליום" suffix="₪" value={costPerWorker} onChange={setCostPerWorker} />
        </Row>
        <Computed label="עלות פועלים" value={fmtMoney(wc)} />
      </Card>

      {/* בית הבד */}
      <Card>
        <H>🏭 בית הבד</H>
        <Muted>
          {season.pricePerKg != null || season.pricePerTank != null
            ? `לפי ${fmt(season.pricePerKg, 2)} ₪ לק״ג + ${fmt(season.pricePerTank, 2)} ₪ למיכל (${season.pricesIncludeVat ? 'כולל' : 'לפני'} מע״מ)`
            : 'לא הוגדרו מחירי בית הבד למסיק – אפשר להגדיר אותם, או להזין כאן את הסכום ששולם'}
        </Muted>
        <Btn title="✏️ שינוי מחירי בית הבד" small variant="secondary" onPress={() => router.push(`/season/edit?id=${season.id}`)} />
        <Field
          label="שולם לבית הבד"
          suffix="₪"
          value={pressPaid}
          onChange={setPressPaid}
          placeholder={autoPress != null ? 'מחושב לבד' : 'הזן סכום'}
          hint={pressPaid ? 'הוזן ידנית (מחק כדי לחשב לבד)' : autoPress != null ? 'מחושב לבד לפי המחירים. אם שילמת סכום אחר – הזן אותו כאן' : undefined}
        />
        {pressPaid ? (
          <Segmented
            options={[{ id: 'incl', name: 'הסכום כולל מע״מ' }, { id: 'excl', name: 'הסכום לפני מע״מ' }]}
            value={paidInclVat}
            onChange={setPaidInclVat}
          />
        ) : null}
        {pb ? (
          <View style={{ backgroundColor: C.primarySoft, borderRadius: 10, padding: 12 }}>
            <MoneyLine label="לפני מע״מ" value={fmtMoney(pb.net)} />
            <MoneyLine label={`מע״מ ${fmt(pb.rate, 2)}%`} value={`+ ${fmtMoney(pb.vat)}`} />
            <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
            <MoneyLine label="🧮 לתשלום (כולל מע״מ)" value={fmtMoney(pb.gross)} bold />
          </View>
        ) : null}
      </Card>

      {/* סיכום היום */}
      <Card style={{ backgroundColor: C.accentSoft, borderColor: '#EBD98F' }}>
        <H>סיכום היום</H>
        <Row>
          <Computed label="סה״כ ק״ג זיתים" value={fmt(totalKg)} />
          <Computed label="סה״כ ק״ג שמן" value={fmt(totalOil)} />
        </Row>
        <Row>
          <Computed label="סה״כ מיכלים" value={fmt(draft.lines.reduce((a, x) => a + (lineTanks(x) ?? 0), 0))} />
          <Computed label="אחוז שמן" value={fmtPct(totalKg > 0 && totalOil > 0 ? oilPct(totalKg, totalOil) : null)} />
        </Row>
        <Row>
          <Computed label="עלות כוללת (כולל מע״מ)" value={fmtMoney(totalCost || null)} />
          <Computed label="עלות לק״ג שמן" value={totalCost && totalOil ? `${fmt(totalCost / totalOil, 1)} ₪` : '—'} />
        </Row>
      </Card>

      <Card>
        <Field label="📝 הערות" value={notes} onChange={setNotes} numeric={false} multiline />
      </Card>

      {existing ? (
        <Btn
          title="🗑️ מחק יום מסיק"
          variant="danger"
          onPress={() =>
            confirm('למחוק את יום המסיק?', `${fmtDate(existing.date)} – ${nameOf(data.plots, existing.plotId)}`, () => {
              deleteEntry(existing.id);
              router.back();
            })
          }
        />
      ) : null}

      <NameModal
        visible={adding !== null}
        title={adding === 'plots' ? 'חלקה חדשה' : 'סוג זית חדש'}
        onClose={() => setAdding(null)}
        onSave={(name) => {
          const item = addNamed(adding!, name);
          if (adding === 'plots') setPlotId(item.id);
          else setLines((ls) => [...ls, { varietyId: item.id, bins: '', kg: '', oilKg: '', tanks: '' }]);
        }}
      />
    </Screen>
  );
}

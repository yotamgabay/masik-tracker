import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Btn, Card, H, Muted, Row, Screen, Stat, StatGrid, notify } from '../../components/ui';
import { C } from '../../components/theme';
import { oilPct, pressCost, sortEntries, summarize, workersCost } from '../../lib/calc';
import { exportExcel } from '../../lib/excel';
import { fmt, fmtDate, fmtMoney, fmtPct, weekday } from '../../lib/format';
import { sendToWhatsApp } from '../../lib/share';
import { nameOf, useData } from '../../lib/store';
import { seasonSummaryText } from '../../lib/summary';

export default function SeasonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useData();
  const season = data.seasons.find((s) => s.id === id);
  if (!season) return <Screen><Muted>המסיק לא נמצא</Muted></Screen>;

  const entries = sortEntries(data.entries.filter((e) => e.seasonId === season.id)).reverse();
  const t = summarize(data, entries);

  return (
    <Screen footer={<Btn title="➕ יום מסיק חדש" onPress={() => router.push(`/entry/edit?seasonId=${season.id}`)} />}>
      <Stack.Screen options={{ title: season.name }} />

      <StatGrid>
        <Stat label="ק״ג זיתים" value={fmt(t.kg)} />
        <Stat label="ליטר שמן" value={fmt(t.liters)} />
        <Stat label="אחוז שמן ממוצע" value={fmtPct(t.pct)} highlight />
        <Stat label="מיכלים" value={fmt(t.tanks)} />
        <Stat label="דולבים" value={fmt(t.bins)} />
        <Stat label="ק״ג לדולב" value={fmt(t.kgPerBin)} />
        <Stat label="עלות פועלים" value={fmtMoney(t.workersCost)} />
        <Stat label="בית הבד" value={fmtMoney(t.pressCost)} />
        <Stat label="עלות כוללת" value={fmtMoney(t.totalCost)} />
        <Stat label="עלות לליטר" value={t.costPerLiter ? `${fmt(t.costPerLiter, 1)} ₪` : '—'} highlight />
      </StatGrid>

      <Btn title="📲 שלח סיכום בוואטסאפ" variant="whatsapp" onPress={() => sendToWhatsApp(seasonSummaryText(data, season))} />
      <Row>
        <Btn
          title="📊 ייצוא לאקסל"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => exportExcel(data, season).catch((e) => notify('הייצוא נכשל', String(e)))}
        />
        <Btn title="✏️ מחירים ושם" variant="secondary" style={{ flex: 1 }} onPress={() => router.push(`/season/edit?id=${season.id}`)} />
      </Row>
      {season.pricePerKg == null && season.pricePerTank == null ? (
        <Muted>💡 כדאי למלא את מחירי בית הבד ב"מחירים ושם", כדי שהתשלום יחושב לבד.</Muted>
      ) : (
        <Muted>🏭 מחירי בית הבד: {fmt(season.pricePerKg, 2)} ₪ לק״ג זיתים · {fmt(season.pricePerTank, 2)} ₪ למיכל</Muted>
      )}

      <H>ימי מסיק ({entries.length})</H>
      {entries.length === 0 ? <Muted>עוד לא נוספו ימי מסיק. לחץ על "יום מסיק חדש" למטה.</Muted> : null}
      {entries.map((e) => {
        const kg = e.lines.reduce((a, l) => a + (l.kg ?? 0), 0);
        const liters = e.lines.reduce((a, l) => a + (l.liters ?? 0), 0);
        const cost = (workersCost(e) ?? 0) + (pressCost(e, season) ?? 0);
        return (
          <Pressable key={e.id} onPress={() => router.push(`/entry/edit?seasonId=${season.id}&id=${e.id}`)}>
            {({ pressed }) => (
              <Card style={{ opacity: pressed ? 0.8 : 1, gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>
                    {weekday(e.date)} {fmtDate(e.date)}
                  </Text>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: C.primary }}>{nameOf(data.plots, e.plotId)}</Text>
                </Row>
                {e.lines.map((l) => (
                  <Text key={l.varietyId} style={{ fontSize: 16, color: C.text }}>
                    • {nameOf(data.varieties, l.varietyId)}: {fmt(l.kg)} ק״ג → {fmt(l.liters)} ליטר
                    <Text style={{ color: C.primary, fontWeight: '700' }}>  {fmtPct(oilPct(l.kg, l.liters))}</Text>
                  </Text>
                ))}
                <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                  <Muted>סה״כ {fmt(kg)} ק״ג · {fmt(liters)} ליטר</Muted>
                  {e.workers ? <Muted>👷 {fmt(e.workers)} פועלים</Muted> : null}
                  {cost > 0 ? <Muted>💰 {fmtMoney(cost)}</Muted> : null}
                </View>
              </Card>
            )}
          </Pressable>
        );
      })}
    </Screen>
  );
}

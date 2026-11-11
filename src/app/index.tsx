import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Btn, Card, H, Muted, Row, Screen, s } from '../components/ui';
import { C } from '../components/theme';
import { summarize } from '../lib/calc';
import { fmt, fmtDate, fmtPct } from '../lib/format';
import { useData } from '../lib/store';

export default function Home() {
  const { data, problem } = useData();
  const seasons = [...data.seasons].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <Screen>
      {problem ? (
        <Card style={{ backgroundColor: C.dangerSoft, borderColor: '#F2C4BF' }}>
          <H>⚠️ לא הצלחתי לקרוא את הנתונים</H>
          <Muted>
            הנתונים לא נמחקו. כדי לא לדרוס אותם, האפליקציה לא שומרת שום שינוי עכשיו. אפשר לשחזר גיבוי אוטומטי בהגדרות, או לשלוח את הנתונים לבדיקה.
          </Muted>
          <Btn title="⚙️ להגדרות" variant="danger" onPress={() => router.push('/settings')} />
        </Card>
      ) : null}
      <Btn title="➕ מסיק חדש" onPress={() => router.push('/season/edit')} />

      {seasons.length === 0 ? (
        <Card>
          <H>ברוך הבא!</H>
          <Muted>כדי להתחיל, צור מסיק חדש (למשל ״מסיק 2026״), ואז הוסף כל יום מסיק עם הדולבים, המשקל והשמן.</Muted>
        </Card>
      ) : null}

      {seasons.map((season) => {
        const t = summarize(data, data.entries.filter((e) => e.seasonId === season.id));
        return (
          <Pressable key={season.id} onPress={() => router.push(`/season/${season.id}`)}>
            {({ pressed }) => (
              <Card style={{ opacity: pressed ? 0.8 : 1 }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <H>{season.name}</H>
                  <Text style={{ fontSize: 22, color: C.primary }}>‹</Text>
                </Row>
                <Muted>
                  {t.days > 0 ? `${t.days} ימי מסיק · ${fmtDate(t.firstDate, false)}–${fmtDate(t.lastDate, false)}` : 'עוד אין ימי מסיק'}
                </Muted>
                {t.days > 0 ? (
                  <Row style={{ gap: 18 }}>
                    <Big label="ק״ג זיתים" value={fmt(t.kg)} />
                    <Big label="ק״ג שמן" value={fmt(t.oilKg)} />
                    <Big label="אחוז שמן" value={fmtPct(t.pct)} />
                  </Row>
                ) : null}
              </Card>
            )}
          </Pressable>
        );
      })}

      <Btn title="💬 שאל את העוזר" variant="secondary" onPress={() => router.push('/chat')} />
      <Row>
        <Btn title="📊 סטטיסטיקות" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/stats')} />
        <Btn title="⚙️ הגדרות" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/settings')} />
      </Row>
    </Screen>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={[s.statValue, { fontSize: 20 }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { HEB_MONTHS, toISO, todayISO } from '../lib/format';
import { C, R } from './theme';

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

type Props = {
  visible: boolean;
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  onClose: () => void;
};

/** לוח שנה בעברית: בחירת יום, מעבר בין חודשים, ומעבר מהיר לשנה */
export function DatePicker({ visible, value, onChange, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 }} onPress={onClose}>
        {/* התוכן נבנה מחדש בכל פתיחה, כדי להתחיל מהחודש של התאריך הנוכחי */}
        {visible ? <Calendar value={value} onChange={onChange} onClose={onClose} /> : null}
      </Pressable>
    </Modal>
  );
}

function Calendar({ value, onChange, onClose }: Omit<Props, 'visible'>) {
  const [y0, m0] = value.split('-').map(Number);
  const [year, setYear] = useState(y0);
  const [month, setMonth] = useState(m0 - 1); // 0-11
  const [mode, setMode] = useState<'days' | 'years'>('days');
  const today = todayISO();

  const shiftMonth = (d: number) => {
    const dt = new Date(year, month + d, 1);
    setYear(dt.getFullYear());
    setMonth(dt.getMonth());
  };
  const pick = (iso: string) => {
    onChange(iso);
    onClose();
  };

  const firstDow = new Date(year, month, 1).getDay(); // 0 = ראשון
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const thisYear = Number(today.slice(0, 4));
  const years = Array.from({ length: thisYear + 1 - 1990 + 1 }, (_, i) => thisYear + 1 - i);

  return (
    // לחיצה בתוך הלוח לא סוגרת אותו
    <Pressable onPress={() => {}} style={{ backgroundColor: C.card, borderRadius: R + 4, padding: 14, gap: 10 }}>
      {/* כותרת: חודש ושנה + חיצים. ב-RTL הקודם מימין והבא משמאל */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {mode === 'days' ? <NavBtn label="→" a11y="חודש קודם" onPress={() => shiftMonth(-1)} /> : <View style={{ width: 48 }} />}
        <Pressable
          onPress={() => setMode(mode === 'days' ? 'years' : 'days')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.primarySoft }}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.primaryDark }}>
            {mode === 'days' ? `${HEB_MONTHS[month]} ${year}` : 'בחר שנה'}
          </Text>
          <Text style={{ fontSize: 14, color: C.primaryDark }}>{mode === 'days' ? '▾' : '▴'}</Text>
        </Pressable>
        {mode === 'days' ? <NavBtn label="←" a11y="חודש הבא" onPress={() => shiftMonth(1)} /> : <View style={{ width: 48 }} />}
      </View>

      {mode === 'years' ? (
        <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 }}>
          {years.map((yy) => {
            const on = yy === year;
            return (
              <Pressable
                key={yy}
                onPress={() => { setYear(yy); setMode('days'); }}
                style={{ flexBasis: '30%', flexGrow: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: on ? C.primary : C.bg, borderWidth: 1, borderColor: on ? C.primary : C.border }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: on ? '#fff' : C.text }}>{yy}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: 14, color: C.muted, fontWeight: '700' }}>{w}</Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'row' }}>
              {week.map((d, di) => {
                if (d == null) return <View key={di} style={{ flex: 1, aspectRatio: 1 }} />;
                const iso = toISO(new Date(year, month, d));
                const selected = iso === value;
                const isToday = iso === today;
                return (
                  <Pressable key={di} onPress={() => pick(iso)} style={{ flex: 1, aspectRatio: 1, padding: 2 }} accessibilityRole="button" accessibilityLabel={iso}>
                    {({ pressed }) => (
                      <View
                        style={{
                          flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: selected ? C.primary : pressed ? C.primarySoft : 'transparent',
                          borderWidth: isToday && !selected ? 2 : 0, borderColor: C.accent,
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: selected || isToday ? '800' : '500', color: selected ? '#fff' : C.text }}>{d}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={() => pick(today)} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.primaryDark }}>היום</Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.muted }}>ביטול</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function NavBtn({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={a11y}
      style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <Text style={{ fontSize: 22, color: C.primaryDark, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

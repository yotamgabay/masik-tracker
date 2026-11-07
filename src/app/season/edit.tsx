import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Btn, Card, Field, H, Muted, Screen, Row, Segmented, confirm, notify } from '../../components/ui';
import { DEFAULT_VAT, splitVat } from '../../lib/calc';
import { fmt, fmtMoney, numToStr, parseNum, uid } from '../../lib/format';
import { useData } from '../../lib/store';

export default function SeasonEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, saveSeason, deleteSeason } = useData();
  const existing = data.seasons.find((s) => s.id === id);
  // מחירים – ברירת מחדל מהמסיק האחרון
  const last = [...data.seasons].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  const [name, setName] = useState(existing?.name ?? `מסיק ${new Date().getFullYear()}`);
  const [perKg, setPerKg] = useState(numToStr(existing ? existing.pricePerKg : last?.pricePerKg));
  const [perTank, setPerTank] = useState(numToStr(existing ? existing.pricePerTank : last?.pricePerTank));
  const [vat, setVat] = useState(numToStr(existing ? existing.vatRate : last?.vatRate ?? DEFAULT_VAT));
  const [inclVat, setInclVat] = useState<'excl' | 'incl'>(
    (existing ? existing.pricesIncludeVat : last?.pricesIncludeVat) ? 'incl' : 'excl',
  );
  const vatNum = parseNum(vat) ?? 0;
  const example = splitVat(1000, inclVat === 'incl', vatNum);
  const entriesCount = existing ? data.entries.filter((e) => e.seasonId === existing.id).length : 0;

  const save = () => {
    if (!name.trim()) return notify('צריך לתת שם למסיק');
    const sid = existing?.id ?? uid();
    saveSeason({
      id: sid,
      name: name.trim(),
      pricePerKg: parseNum(perKg),
      pricePerTank: parseNum(perTank),
      vatRate: vatNum,
      pricesIncludeVat: inclVat === 'incl',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
    if (existing) router.back();
    else router.replace(`/season/${sid}`);
  };

  return (
    <Screen footer={<Btn title="💾 שמור" onPress={save} />}>
      <Stack.Screen options={{ title: existing ? 'עריכת מסיק' : 'מסיק חדש' }} />
      <Card>
        <Field label="שם המסיק" value={name} onChange={setName} numeric={false} />
      </Card>
      <Card>
        <H>🏭 מחירי בית הבד</H>
        <Muted>ממלאים פעם אחת לכל המסיק, לפי מה שבית הבד גובה. ככה התשלום לבית הבד יחושב לבד בכל יום. אפשר לשנות בכל רגע.</Muted>
        <Row>
          <Field label="עלות לק״ג זיתים" value={perKg} onChange={setPerKg} suffix="₪" placeholder="למשל 0.9" />
          <Field label="עלות למיכל" value={perTank} onChange={setPerTank} suffix="₪" placeholder="למשל 15" />
        </Row>
      </Card>
      <Card>
        <H>🧾 מע״מ על בית הבד</H>
        <Muted>המחירים שהזנת למעלה הם:</Muted>
        <Segmented
          options={[{ id: 'excl', name: 'לפני מע״מ' }, { id: 'incl', name: 'כולל מע״מ' }]}
          value={inclVat}
          onChange={setInclVat}
        />
        <Field label="אחוז מע״מ" value={vat} onChange={setVat} suffix="%" />
        <Muted>
          {inclVat === 'excl'
            ? `דוגמה: על חשבון של ${fmtMoney(1000)} יתווסף מע״מ של ${fmtMoney(example.vat)}, וסה״כ לתשלום ${fmtMoney(example.gross)}.`
            : `דוגמה: מתוך חשבון של ${fmtMoney(1000)}, ${fmtMoney(example.vat)} הם מע״מ.`}
        </Muted>
      </Card>
      {existing ? (
        <Btn
          title="🗑️ מחק מסיק"
          variant="danger"
          onPress={() =>
            confirm('למחוק את המסיק?', `${existing.name} ו-${fmt(entriesCount)} ימי המסיק שבו יימחקו לצמיתות.`, () => {
              deleteSeason(existing.id);
              router.dismissTo('/');
            })
          }
        />
      ) : null}
    </Screen>
  );
}

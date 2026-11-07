import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Btn, Card, H, Muted, NameModal, Screen, confirm, notify } from '../components/ui';
import { C } from '../components/theme';
import { exportExcel } from '../lib/excel';
import { pickTextFile, shareFile } from '../lib/files';
import { todayISO } from '../lib/format';
import { isNamedInUse, normalizeData, useData } from '../lib/store';
import type { Named } from '../lib/types';

type Kind = 'varieties' | 'plots';

export default function Settings() {
  const { data, addNamed, renameNamed, setArchived, deleteNamed, replaceAll } = useData();
  const [modal, setModal] = useState<null | { kind: Kind; item?: Named }>(null);

  const list = (kind: Kind, title: string, addTitle: string) => (
    <Card>
      <H>{title}</H>
      {data[kind].map((item) => (
        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
          <Text style={{ flex: 1, fontSize: 18, color: item.archived ? C.muted : C.text, textDecorationLine: item.archived ? 'line-through' : 'none' }}>
            {item.name}
          </Text>
          <Small title="שנה שם" onPress={() => setModal({ kind, item })} />
          {isNamedInUse(data, kind, item.id) ? (
            <Small title={item.archived ? 'החזר' : 'הסתר'} onPress={() => setArchived(kind, item.id, !item.archived)} />
          ) : (
            <Small title="מחק" danger onPress={() => confirm(`למחוק את "${item.name}"?`, '', () => deleteNamed(kind, item.id))} />
          )}
        </View>
      ))}
      <Btn title={addTitle} variant="secondary" onPress={() => setModal({ kind })} />
    </Card>
  );

  const backup = async () => {
    try {
      await shareFile(`גיבוי מסיק ${todayISO()}.json`, JSON.stringify(data), 'application/json');
    } catch (e) {
      notify('הגיבוי נכשל', String(e));
    }
  };

  const restore = async () => {
    try {
      const text = await pickTextFile();
      if (!text) return;
      const nd = normalizeData(JSON.parse(text));
      confirm(
        'לשחזר מגיבוי?',
        `בגיבוי יש ${nd.seasons.length} מסיקים ו-${nd.entries.length} ימי מסיק. כל הנתונים הנוכחיים בטלפון יוחלפו.`,
        () => { replaceAll(nd); notify('השחזור הושלם ✅'); },
        'שחזר',
      );
    } catch {
      notify('לא הצלחתי לקרוא את הקובץ', 'צריך לבחור קובץ גיבוי (json) שנוצר מהאפליקציה.');
    }
  };

  return (
    <Screen>
      {list('varieties', '🫒 סוגי זיתים', '+ הוסף סוג זית')}
      {list('plots', '📍 חלקות', '+ הוסף חלקה')}
      <Muted>סוג או חלקה שכבר יש עליהם נתונים אי אפשר למחוק, רק להסתיר מהרשימה.</Muted>

      <Card>
        <H>💾 גיבוי ושחזור</H>
        <Muted>כל המידע שמור רק בטלפון הזה. מומלץ לשלוח גיבוי לעצמך בוואטסאפ או במייל מדי פעם, ובטח בסוף המסיק.</Muted>
        <Btn title="📤 שלח קובץ גיבוי" onPress={backup} />
        <Btn title="📥 שחזר מקובץ גיבוי" variant="secondary" onPress={restore} />
        <Btn title="📊 ייצוא כל המסיקים לאקסל" variant="secondary" onPress={() => exportExcel(data).catch((e) => notify('הייצוא נכשל', String(e)))} />
      </Card>

      <NameModal
        visible={modal !== null}
        title={modal?.item ? 'שינוי שם' : modal?.kind === 'plots' ? 'חלקה חדשה' : 'סוג זית חדש'}
        initial={modal?.item?.name ?? ''}
        onClose={() => setModal(null)}
        onSave={(name) => {
          if (!modal) return;
          if (modal.item) renameNamed(modal.kind, modal.item.id, name);
          else addNamed(modal.kind, name);
        }}
      />
    </Screen>
  );
}

function Small({ title, onPress, danger }: { title: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: danger ? C.dangerSoft : C.primarySoft }}>
      <Text style={{ color: danger ? C.danger : C.primaryDark, fontSize: 15, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

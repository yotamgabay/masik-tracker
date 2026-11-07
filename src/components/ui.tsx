import React, { createContext, useContext, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type ViewStyle,
} from 'react-native';
import { C, R } from './theme';

/** רכיבים בתוך Row מתחלקים לעמודות; מחוץ ל-Row הם ברוחב מלא */
const InRow = createContext(false);
const cell = { flexGrow: 1, flexBasis: 130 } as const;

export function Screen({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H({ children }: { children: React.ReactNode }) {
  return <Text style={s.h}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={s.muted}>{children}</Text>;
}

type BtnProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'whatsapp' | 'ghost';
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};
export function Btn({ title, onPress, variant = 'primary', style, small }: BtnProps) {
  const bg = { primary: C.primary, secondary: C.primarySoft, danger: C.dangerSoft, whatsapp: C.whatsapp, ghost: 'transparent' }[variant];
  const fg = { primary: '#fff', secondary: C.primaryDark, danger: C.danger, whatsapp: '#fff', ghost: C.primary }[variant];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: bg, opacity: pressed ? 0.75 : 1 }, style]}
      accessibilityRole="button"
    >
      <Text style={[s.btnText, small && { fontSize: 16 }, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
  hint?: string;
  numeric?: boolean;
  multiline?: boolean;
};
export function Field({ label, value, onChange, suffix, placeholder, hint, numeric = true, multiline }: FieldProps) {
  const inRow = useContext(InRow);
  return (
    <View style={[s.field, inRow && cell]}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputRow}>
        <TextInput
          style={[s.input, multiline && { minHeight: 70, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChange}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          placeholder={placeholder}
          placeholderTextColor="#A9AA9C"
          multiline={multiline}
          selectTextOnFocus
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/** שדה מחושב – לא ניתן לעריכה */
export function Computed({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const inRow = useContext(InRow);
  return (
    <View style={[s.computed, inRow && cell, big && { backgroundColor: C.accentSoft }]}>
      <Text style={s.computedLabel}>🧮 {label}</Text>
      <Text style={[s.computedValue, big && { fontSize: 24 }]}>{value}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <InRow.Provider value>
      <View style={[s.row, style]}>{children}</View>
    </InRow.Provider>
  );
}

export function Chips<T extends string>({
  options, selected, onToggle, onAdd, addLabel = '+ חדש',
}: {
  options: { id: T; name: string }[];
  selected: T[];
  onToggle: (id: T) => void;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <View style={s.chips}>
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <Pressable key={o.id} onPress={() => onToggle(o.id)} style={[s.chip, on && s.chipOn]}>
            <Text style={[s.chipText, on && { color: '#fff' }]}>{on ? '✓ ' : ''}{o.name}</Text>
          </Pressable>
        );
      })}
      {onAdd ? (
        <Pressable onPress={onAdd} style={[s.chip, s.chipAdd]}>
          <Text style={[s.chipText, { color: C.primary }]}>{addLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** בחירה בין שתי אפשרויות (או יותר), כפתורים צמודים */
export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { id: T; name: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={[s.segItem, on && s.segOn]} accessibilityRole="button">
            <Text style={[s.segText, on && { color: '#fff' }]}>{on ? '✓ ' : ''}{o.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** שורת סכום בפירוט (לפני מע״מ / מע״מ / סה״כ) */
export function MoneyLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={{ fontSize: bold ? 18 : 16, color: bold ? C.text : C.muted, fontWeight: bold ? '800' : '500' }}>{label}</Text>
      <Text style={{ fontSize: bold ? 20 : 16, color: C.text, fontWeight: bold ? '800' : '600' }}>{value}</Text>
    </View>
  );
}

export function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[s.stat, highlight && { backgroundColor: C.accentSoft, borderColor: '#EBD98F' }]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={s.statGrid}>{children}</View>;
}

/** חלון קטן להקלדת שם (סוג זית / חלקה חדשה) */
export function NameModal({
  visible, title, initial = '', onClose, onSave,
}: { visible: boolean; title: string; initial?: string; onClose: () => void; onSave: (name: string) => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* התוכן נבנה מחדש בכל פתיחה, כך שהשדה מתחיל מהערך ההתחלתי */}
      {visible ? <NameModalBody title={title} initial={initial} onClose={onClose} onSave={onSave} /> : null}
    </Modal>
  );
}

function NameModalBody({
  title, initial, onClose, onSave,
}: { title: string; initial: string; onClose: () => void; onSave: (name: string) => void }) {
  const [v, setV] = useState(initial);
  return (
      <View style={s.modalBg}>
        <View style={s.modal}>
          <H>{title}</H>
          <TextInput style={[s.input, { marginVertical: 12 }]} value={v} onChangeText={setV} autoFocus />
          <Row>
            <Btn title="שמור" style={{ flex: 1 }} onPress={() => { if (v.trim()) { onSave(v.trim()); onClose(); } }} />
            <Btn title="ביטול" variant="secondary" style={{ flex: 1 }} onPress={onClose} />
          </Row>
        </View>
      </View>
  );
}

export function confirm(title: string, message: string, onOk: () => void, okText = 'מחק') {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'ביטול', style: 'cancel' },
    { text: okText, style: 'destructive', onPress: onOk },
  ]);
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') globalThis.alert?.(message ? `${title}\n${message}` : title);
  else Alert.alert(title, message);
}

export const s = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, gap: 14 },
  footer: { padding: 12, paddingBottom: 20, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  card: { backgroundColor: C.card, borderRadius: R, padding: 16, borderWidth: 1, borderColor: C.border, gap: 12 },
  h: { fontSize: 20, fontWeight: '700', color: C.text },
  muted: { fontSize: 15, color: C.muted },
  btn: { borderRadius: R, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 14 },
  btnText: { fontSize: 18, fontWeight: '700' },
  field: { minWidth: 0, gap: 4 },
  label: { fontSize: 15, color: C.muted, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    flex: 1, minWidth: 0, width: '100%', borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 20, color: C.text, backgroundColor: '#FDFDFB',
  },
  suffix: { fontSize: 16, color: C.muted, minWidth: 30 },
  hint: { fontSize: 13, color: C.muted },
  computed: { backgroundColor: C.primarySoft, borderRadius: 10, padding: 10, gap: 2 },
  computedLabel: { fontSize: 14, color: C.primaryDark },
  computedValue: { fontSize: 20, fontWeight: '700', color: C.primaryDark },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.primary, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  chipOn: { backgroundColor: C.primary },
  chipAdd: { borderStyle: 'dashed' },
  chipText: { fontSize: 17, color: C.primaryDark, fontWeight: '600' },
  seg: { flexDirection: 'row', borderWidth: 1.5, borderColor: C.primary, borderRadius: 12, overflow: 'hidden' },
  segItem: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.primary },
  segText: { fontSize: 16, fontWeight: '700', color: C.primaryDark, textAlign: 'center' },
  stat: { flexGrow: 1, flexBasis: '45%', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12 },
  statValue: { fontSize: 22, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 14, color: C.muted, marginTop: 2 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: C.card, borderRadius: R, padding: 20 },
});

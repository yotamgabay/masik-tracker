import type Anthropic from '@anthropic-ai/sdk';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { Btn, Card, H, Muted } from '../components/ui';
import { C } from '../components/theme';
import { aiErrorMessage, askAssistant } from '../lib/ai';
import { loadApiKey } from '../lib/aiKey';
import { sendToWhatsApp } from '../lib/share';
import { useData } from '../lib/store';

type Bubble = { role: 'user' | 'assistant' | 'error'; text: string };

const SUGGESTIONS = [
  'איזה סוג זית נתן את אחוז השמן הכי גבוה?',
  'השווה בין החלקות',
  'כמה עלה לי קילו שמן?',
  'סכם לי את המסיק האחרון',
  'מה משפיע על אחוז השמן?',
  'מתי הכי כדאי לקטוף?',
];

export default function Chat() {
  const { data } = useData();
  const headerHeight = useHeaderHeight();
  const [apiKey] = useState(loadApiKey);
  const [history, setHistory] = useState<Anthropic.MessageParam[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    const nextHistory: Anthropic.MessageParam[] = [...history, { role: 'user', content: q }];
    setBubbles((b) => [...b, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const res = await askAssistant(apiKey, data, nextHistory);
      // שומרים את תוכן התשובה המלא בהיסטוריה (כולל בלוקים שלא מוצגים)
      setHistory([...nextHistory, { role: 'assistant', content: res.content }]);
      setBubbles((b) => [...b, { role: 'assistant', text: res.text }]);
    } catch (e) {
      // השאלה לא נכנסת להיסטוריה, כך שאפשר פשוט לשאול שוב
      setBubbles((b) => [...b, { role: 'error', text: aiErrorMessage(e) }]);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setHistory([]);
    setBubbles([]);
  };

  if (!apiKey) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card>
          <H>💬 העוזר עוד לא מחובר</H>
          <Muted>כדי להפעיל את העוזר צריך להזין פעם אחת מפתח של Claude בהגדרות.</Muted>
          <Btn title="⚙️ להגדרות" onPress={() => router.replace('/settings')} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {bubbles.length === 0 ? (
          <Card>
            <H>👋 שלום! אני העוזר של המסיק</H>
            <Muted>אפשר לשאול אותי על הנתונים שלך, למשל איזו חלקה הייתה הכי טובה, וגם שאלות כלליות על זיתים ושמן. לחץ על שאלה או כתוב משלך:</Muted>
            <View style={{ gap: 8 }}>
              {SUGGESTIONS.map((q) => (
                <Pressable key={q} onPress={() => send(q)} style={{ borderWidth: 1.5, borderColor: C.primary, borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 16, color: C.primaryDark, fontWeight: '600' }}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        {bubbles.map((b, i) => (
          <View
            key={i}
            style={{
              alignSelf: b.role === 'user' ? 'flex-start' : 'flex-end',
              maxWidth: '88%',
              backgroundColor: b.role === 'user' ? C.primary : b.role === 'error' ? C.dangerSoft : C.card,
              borderRadius: 16,
              borderWidth: b.role === 'user' ? 0 : 1,
              borderColor: b.role === 'error' ? '#F2C4BF' : C.border,
              padding: 12,
              gap: 6,
            }}
          >
            <Text selectable style={{ fontSize: 17, lineHeight: 25, color: b.role === 'user' ? '#fff' : b.role === 'error' ? C.danger : C.text }}>
              {b.text}
            </Text>
            {b.role === 'assistant' ? (
              <Pressable onPress={() => sendToWhatsApp(b.text)} hitSlop={8}>
                <Text style={{ fontSize: 14, color: C.whatsapp, fontWeight: '700' }}>📲 שלח בוואטסאפ</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        {busy ? (
          <View style={{ alignSelf: 'flex-end', flexDirection: 'row', gap: 8, alignItems: 'center', padding: 8 }}>
            <ActivityIndicator color={C.primary} />
            <Muted>חושב…</Muted>
          </View>
        ) : null}

        {bubbles.length > 0 && !busy ? (
          <Pressable onPress={reset} style={{ alignSelf: 'center', padding: 8 }}>
            <Text style={{ color: C.muted, fontSize: 15 }}>🔄 שיחה חדשה</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8, padding: 10, paddingBottom: 16, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg, alignItems: 'flex-end' }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="כתוב שאלה…"
          placeholderTextColor="#A9AA9C"
          multiline
          style={{
            flex: 1, minWidth: 0, maxHeight: 120, borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
            paddingHorizontal: 12, paddingVertical: 10, fontSize: 18, color: C.text, backgroundColor: '#FDFDFB',
          }}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={busy || !input.trim()}
          style={{ backgroundColor: busy || !input.trim() ? '#B9C09F' : C.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13 }}
          accessibilityRole="button"
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>שלח</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

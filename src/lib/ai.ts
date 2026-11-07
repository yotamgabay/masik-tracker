import Anthropic from '@anthropic-ai/sdk';
import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { systemPrompt } from './aiContext';
import type { AppData } from './types';

export const AI_MODEL = 'claude-haiku-5-5';

function client(apiKey: string) {
  return new Anthropic({
    apiKey,
    // המפתח שמור רק בטלפון של המשתמש (אפשרות שנבחרה במכוון)
    dangerouslyAllowBrowser: true,
    ...(Platform.OS === 'web' ? {} : { fetch: expoFetch as unknown as typeof globalThis.fetch }),
  });
}

/** שולח את השיחה ומחזיר את תשובת העוזר (התוכן המלא לשמירה בהיסטוריה + הטקסט להצגה) */
export async function askAssistant(apiKey: string, data: AppData, history: Anthropic.MessageParam[]) {
  const response = await client(apiKey).messages.create({
    model: AI_MODEL,
    max_tokens: 4000,
    output_config: { effort: 'low' },
    cache_control: { type: 'ephemeral' },
    system: systemPrompt(data),
    messages: history,
  });
  if (response.stop_reason === 'refusal') {
    return { content: response.content, text: 'מצטער, על זה אני לא יכול לענות. נסה לשאול אחרת.' };
  }
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .replace(/\*\*/g, '')
    .trim();
  const cut = response.stop_reason === 'max_tokens' ? '\n\n(התשובה נקטעה כי הייתה ארוכה מדי)' : '';
  return { content: response.content, text: (text || '…') + cut };
}

/** בדיקה שהמפתח עובד (לא עולה כסף) */
export async function checkApiKey(apiKey: string) {
  await client(apiKey).models.retrieve(AI_MODEL);
}

/** הודעת שגיאה ידידותית בעברית */
export function aiErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'המפתח לא תקין. בדוק אותו בהגדרות.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'למפתח אין הרשאה. בדוק את החשבון ב-Anthropic.';
  if (e instanceof Anthropic.RateLimitError) return 'יותר מדי שאלות ברגע אחד, או שנגמר הקרדיט. נסה שוב בעוד דקה.';
  if (e instanceof Anthropic.APIConnectionError) return 'אין חיבור לאינטרנט. העוזר צריך אינטרנט כדי לענות.';
  if (e instanceof Anthropic.APIError) {
    if (e.status === 400 && /credit|billing/i.test(e.message)) return 'נגמר הקרדיט בחשבון Anthropic.';
    return `שגיאה מהשרת (${e.status ?? '?'}). נסה שוב מאוחר יותר.`;
  }
  return 'משהו השתבש. נסה שוב.';
}

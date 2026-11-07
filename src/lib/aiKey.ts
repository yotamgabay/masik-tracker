import { loadRaw, saveRaw } from './storage';

// המפתח נשמר בנפרד מהנתונים, כדי שלא ייכנס לקובץ הגיבוי
const KEY = 'masik-claude-api-key';
export const loadApiKey = () => (loadRaw(KEY) ?? '').trim();
export const saveApiKey = (k: string) => saveRaw(KEY, k.trim());

// בדפדפן (לבדיקות בלבד) – localStorage
export const loadRaw = (key: string): string | null => {
  try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
};
export const saveRaw = (key: string, value: string) => {
  globalThis.localStorage?.setItem(key, value);
};
export const removeRaw = (key: string) => {
  try { globalThis.localStorage?.removeItem(key); } catch {}
};
export const allKeys = (): string[] => {
  try { return Object.keys(globalThis.localStorage ?? {}); } catch { return []; }
};

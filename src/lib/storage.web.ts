// בדפדפן (לבדיקות בלבד) – localStorage
export const loadRaw = (key: string): string | null => {
  try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
};
export const saveRaw = (key: string, value: string) => {
  try { globalThis.localStorage?.setItem(key, value); } catch {}
};

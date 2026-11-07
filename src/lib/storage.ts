import Storage from 'expo-sqlite/kv-store';

export const loadRaw = (key: string): string | null => Storage.getItemSync(key);
export const saveRaw = (key: string, value: string) => Storage.setItemSync(key, value);

import { allKeys, loadRaw, removeRaw, saveRaw } from './storage';
import { todayISO } from './format';

/**
 * רשת ביטחון לנתונים:
 * - גיבוי יומי אוטומטי בטלפון (נשמרים 14 הימים האחרונים שבהם האפליקציה נפתחה)
 * - עותק של הנתונים המקוריים לפני כל המרה של גרסה חדשה (נשמר לתמיד)
 * - עותק לפני שחזור מגיבוי
 */
export const DATA_KEY = 'masik-data-v1';
const DAILY_PREFIX = 'masik-backup-day-';
export const PRE_MIGRATION_KEY = 'masik-backup-before-upgrade';
export const BEFORE_RESTORE_KEY = 'masik-backup-before-restore';
export const UNREADABLE_KEY = 'masik-backup-unreadable';
const KEEP_DAYS = 14;

/** כל פעולת גיבוי עטופה כך שתקלה בגיבוי לעולם לא תפריע לאפליקציה */
const safe = (fn: () => void) => {
  try { fn(); } catch (e) { console.warn('backup step failed', e); }
};

export function dailySnapshot(raw: string) {
  safe(() => {
    const key = DAILY_PREFIX + todayISO();
    if (loadRaw(key) == null) saveRaw(key, raw);
    const old = allKeys().filter((k) => k.startsWith(DAILY_PREFIX)).sort().slice(0, -KEEP_DAYS);
    old.forEach(removeRaw);
  });
}

/** שומר את הנתונים המקוריים לפני המרה – רק בפעם הראשונה, כדי שהמקור הישן ביותר לא יידרס */
export function preMigrationSnapshot(raw: string) {
  safe(() => {
    if (loadRaw(PRE_MIGRATION_KEY) == null) saveRaw(PRE_MIGRATION_KEY, raw);
  });
}

export function keepCopy(key: string, raw: string | null) {
  if (raw) safe(() => saveRaw(key, raw));
}

export type BackupInfo = { key: string; label: string; raw: string };

export function listBackups(): BackupInfo[] {
  const out: BackupInfo[] = [];
  safe(() => {
    const keys = allKeys();
    const add = (key: string, label: string) => {
      const raw = loadRaw(key);
      if (raw) out.push({ key, label, raw });
    };
    keys.filter((k) => k.startsWith(DAILY_PREFIX)).sort().reverse()
      .forEach((k) => {
        const [y, m, d] = k.slice(DAILY_PREFIX.length).split('-');
        add(k, `גיבוי אוטומטי מ-${d}.${m}.${y}`);
      });
    add(BEFORE_RESTORE_KEY, 'לפני השחזור האחרון');
    add(PRE_MIGRATION_KEY, 'לפני עדכון גרסה (הנתונים המקוריים)');
  });
  return out;
}

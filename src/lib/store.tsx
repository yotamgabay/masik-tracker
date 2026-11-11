import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { loadRaw, saveRaw } from './storage';
import { BEFORE_RESTORE_KEY, DATA_KEY, UNREADABLE_KEY, dailySnapshot, keepCopy, preMigrationSnapshot } from './safety';
import type { AppData, Entry, Named, Season } from './types';
import { uid } from './format';
import { DEFAULT_VAT, OIL_DENSITY } from './calc';

const KEY = DATA_KEY;

function defaultData(): AppData {
  return {
    version: 1,
    varieties: ['ברנע', 'פיקואל', 'קורטינה'].map((name) => ({ id: uid(), name })),
    plots: ['חלקה 12', 'חלקה 200'].map((name) => ({ id: uid(), name })),
    seasons: [],
    entries: [],
    lastCostPerWorker: null,
  };
}

/** בודק ומשלים מבנה של קובץ גיבוי / נתונים שמורים */
export function normalizeData(raw: unknown): AppData {
  const d = raw as Partial<AppData>;
  if (!d || typeof d !== 'object' || !Array.isArray(d.seasons) || !Array.isArray(d.entries)) {
    throw new Error('קובץ לא תקין');
  }
  return {
    version: 1,
    varieties: Array.isArray(d.varieties) ? d.varieties : [],
    plots: Array.isArray(d.plots) ? d.plots : [],
    seasons: d.seasons.map((s) => ({ ...s, vatRate: s.vatRate ?? DEFAULT_VAT, pricesIncludeVat: s.pricesIncludeVat ?? false })),
    entries: d.entries.map((e) => ({
      ...e,
      notes: e.notes ?? '',
      pressPaidOverride: e.pressPaidOverride ?? null,
      pressPaidIncludesVat: e.pressPaidIncludesVat ?? true,
      // גרסאות ראשונות שמרו ליטרים – ממירים לק"ג שמן
      lines: (e.lines ?? []).map((l) => {
        const old = l as typeof l & { liters?: number | null };
        const { liters, ...rest } = old;
        return {
          ...rest,
          oilKg: old.oilKg !== undefined ? old.oilKg : liters != null ? Math.round(liters * OIL_DENSITY * 10) / 10 : null,
        };
      }),
    })),
    lastCostPerWorker: d.lastCostPerWorker ?? null,
  };
}

type Loaded = { data: AppData; problem: null | 'storage' | 'unreadable' };

/**
 * טעינה בטוחה: אם משהו נכשל, לא מתחילים "מאפס" על גבי הנתונים הקיימים.
 * במקרה כזה השמירה נחסמת, כך שהנתונים המקוריים נשארים כמו שהם.
 */
function load(): Loaded {
  let raw: string | null;
  try {
    raw = loadRaw(KEY);
  } catch (e) {
    console.warn('failed to read storage', e);
    return { data: defaultData(), problem: 'storage' };
  }
  if (!raw) return { data: defaultData(), problem: null }; // התקנה חדשה
  dailySnapshot(raw);
  try {
    const data = normalizeData(JSON.parse(raw));
    if (JSON.stringify(data) !== raw) preMigrationSnapshot(raw);
    return { data, problem: null };
  } catch (e) {
    console.warn('failed to parse data', e);
    keepCopy(UNREADABLE_KEY, raw);
    return { data: defaultData(), problem: 'unreadable' };
  }
}

const warn = (title: string, msg: string) => {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n${msg}`);
  else Alert.alert(title, msg);
};

type Ctx = {
  data: AppData;
  /** אם לא null – הנתונים השמורים לא נקראו, והשמירה חסומה כדי לא לדרוס אותם */
  problem: Loaded['problem'];
  saveSeason: (s: Season) => void;
  deleteSeason: (id: string) => void;
  saveEntry: (e: Entry) => void;
  deleteEntry: (id: string) => void;
  addNamed: (kind: 'varieties' | 'plots', name: string) => Named;
  renameNamed: (kind: 'varieties' | 'plots', id: string, name: string) => void;
  setArchived: (kind: 'varieties' | 'plots', id: string, archived: boolean) => void;
  deleteNamed: (kind: 'varieties' | 'plots', id: string) => void;
  replaceAll: (d: AppData) => void;
};

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState(load);
  const [data, setData] = useState<AppData>(initial.data);
  const ref = useRef(data);
  const [problem, setProblem] = useState(initial.problem);

  const update = useCallback((fn: (d: AppData) => AppData, force = false) => {
    if (problem && !force) {
      warn('השמירה חסומה', 'לא הצלחתי לקרוא את הנתונים השמורים, ולכן אני לא שומר כלום כדי לא לדרוס אותם. הנתונים לא נמחקו.');
      return;
    }
    const next = fn(ref.current);
    try {
      saveRaw(KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('save failed', e);
      warn('השמירה נכשלה', 'השינוי האחרון לא נשמר. נסה שוב.');
      return;
    }
    ref.current = next;
    setData(next);
    if (force) setProblem(null);
  }, [problem]);

  const ctx = useMemo<Ctx>(
    () => ({
      data,
      problem,
      saveSeason: (s) =>
        update((d) => ({
          ...d,
          seasons: d.seasons.some((x) => x.id === s.id) ? d.seasons.map((x) => (x.id === s.id ? s : x)) : [...d.seasons, s],
        })),
      deleteSeason: (id) =>
        update((d) => ({ ...d, seasons: d.seasons.filter((s) => s.id !== id), entries: d.entries.filter((e) => e.seasonId !== id) })),
      saveEntry: (e) =>
        update((d) => ({
          ...d,
          lastCostPerWorker: e.costPerWorker ?? d.lastCostPerWorker,
          entries: d.entries.some((x) => x.id === e.id) ? d.entries.map((x) => (x.id === e.id ? e : x)) : [...d.entries, e],
        })),
      deleteEntry: (id) => update((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })),
      addNamed: (kind, name) => {
        const item = { id: uid(), name: name.trim() };
        update((d) => ({ ...d, [kind]: [...d[kind], item] }));
        return item;
      },
      renameNamed: (kind, id, name) =>
        update((d) => ({ ...d, [kind]: d[kind].map((x) => (x.id === id ? { ...x, name: name.trim() } : x)) })),
      setArchived: (kind, id, archived) =>
        update((d) => ({ ...d, [kind]: d[kind].map((x) => (x.id === id ? { ...x, archived } : x)) })),
      deleteNamed: (kind, id) => update((d) => ({ ...d, [kind]: d[kind].filter((x) => x.id !== id) })),
      replaceAll: (nd) => {
        // לפני שחזור שומרים עותק של המצב הנוכחי, כדי שאפשר יהיה לחזור אחורה
        // (גם כשהנתונים לא נקראו – שחזור הוא פעולה מפורשת, והמקור כבר שמור בצד)
        try { keepCopy(BEFORE_RESTORE_KEY, loadRaw(KEY)); } catch {}
        update(() => nd, true);
      },
    }),
    [data, update, problem],
  );

  return <DataContext.Provider value={ctx}>{children}</DataContext.Provider>;
}

export function useData() {
  const c = useContext(DataContext);
  if (!c) throw new Error('useData outside provider');
  return c;
}

export function isNamedInUse(d: AppData, kind: 'varieties' | 'plots', id: string) {
  return kind === 'plots'
    ? d.entries.some((e) => e.plotId === id)
    : d.entries.some((e) => e.lines.some((l) => l.varietyId === id));
}

export const nameOf = (list: Named[], id: string) => list.find((x) => x.id === id)?.name ?? '?';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { loadRaw, saveRaw } from './storage';
import type { AppData, Entry, Named, Season } from './types';
import { uid } from './format';
import { DEFAULT_VAT } from './calc';

const KEY = 'masik-data-v1';

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
      lines: e.lines ?? [],
    })),
    lastCostPerWorker: d.lastCostPerWorker ?? null,
  };
}

function load(): AppData {
  try {
    const raw = loadRaw(KEY);
    if (raw) return normalizeData(JSON.parse(raw));
  } catch (e) {
    console.warn('failed to load data', e);
  }
  return defaultData();
}

type Ctx = {
  data: AppData;
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
  const [data, setData] = useState<AppData>(load);
  const ref = useRef(data);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    const next = fn(ref.current);
    ref.current = next;
    saveRaw(KEY, JSON.stringify(next));
    setData(next);
  }, []);

  const ctx = useMemo<Ctx>(
    () => ({
      data,
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
      replaceAll: (nd) => update(() => nd),
    }),
    [data, update],
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

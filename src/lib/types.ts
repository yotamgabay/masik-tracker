export type Named = { id: string; name: string; archived?: boolean };
export type Variety = Named;
export type Plot = Named;

export type Season = {
  id: string;
  name: string;
  /** מחיר טחינה לק"ג זיתים בבית הבד (₪) */
  pricePerKg: number | null;
  /** מחיר למיכל שמן בבית הבד (₪) */
  pricePerTank: number | null;
  createdAt: string;
};

/** שורה של סוג זית אחד בתוך יום מסיק */
export type EntryLine = {
  varietyId: string;
  bins: number | null;
  kg: number | null;
  liters: number | null;
  /** אם ריק – מחושב אוטומטית מהליטרים */
  tanksOverride: number | null;
};

/** יום מסיק בחלקה אחת */
export type Entry = {
  id: string;
  seasonId: string;
  date: string; // YYYY-MM-DD
  plotId: string;
  workers: number | null;
  costPerWorker: number | null;
  lines: EntryLine[];
  /** אם ריק – מחושב לפי מחירי בית הבד של המסיק */
  pressPaidOverride: number | null;
  notes: string;
};

export type AppData = {
  version: 1;
  varieties: Variety[];
  plots: Plot[];
  seasons: Season[];
  entries: Entry[];
  lastCostPerWorker: number | null;
};

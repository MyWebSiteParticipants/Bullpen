/**
 * Pure model for named watchlists: no React, no localStorage, so it is easy
 * to unit-test (see lists.test.ts). useWatchlist.ts wraps it in a shared store.
 *
 * Every function returns the SAME state object when nothing changed, so the
 * store can skip needless writes and re-renders.
 */

export interface WatchList {
  id: string;
  name: string;
  symbols: string[];
}

export interface WatchlistState {
  /** Which list the Watch tab (and, in #17, Discover / detail) acts on. */
  currentId: string;
  /** Always at least one list. */
  lists: WatchList[];
}

/** The original single list is migrated to a list with this id and name. */
export const DEFAULT_LIST_ID = "default";
export const DEFAULT_LIST_NAME = "Default";
export const MAX_NAME_LENGTH = 30;

// ---------- helpers ----------

/** Uppercase, trim, drop non-strings / blanks / duplicates. */
export function cleanSymbols(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const s of input) {
    if (typeof s !== "string") continue;
    const u = s.trim().toUpperCase();
    if (u && !out.includes(u)) out.push(u);
  }
  return out;
}

/** Trim and collapse inner whitespace. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** A fresh state with a single Default list holding `defaultSymbols`. */
export function initialState(defaultSymbols: string[]): WatchlistState {
  return {
    currentId: DEFAULT_LIST_ID,
    lists: [{ id: DEFAULT_LIST_ID, name: DEFAULT_LIST_NAME, symbols: [...defaultSymbols] }],
  };
}

/** The selected list (falls back to the first list if the id is stale). */
export function currentList(state: WatchlistState): WatchList {
  return state.lists.find((l) => l.id === state.currentId) ?? state.lists[0];
}

function mapList(state: WatchlistState, id: string, fn: (l: WatchList) => WatchList): WatchlistState {
  let changed = false;
  const lists = state.lists.map((l) => {
    if (l.id !== id) return l;
    const next = fn(l);
    if (next !== l) changed = true;
    return next;
  });
  return changed ? { ...state, lists } : state;
}

// ---------- loading / migration ----------

/** Parse the v2 blob. Returns null when it is missing or unusable. */
export function parseV2(raw: string | null): WatchlistState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as { currentId?: unknown; lists?: unknown };
  if (!Array.isArray(d.lists)) return null;

  const lists: WatchList[] = [];
  for (const item of d.lists) {
    if (!item || typeof item !== "object") continue;
    const l = item as { id?: unknown; name?: unknown; symbols?: unknown };
    if (typeof l.id !== "string" || !l.id || lists.some((x) => x.id === l.id)) continue;
    const name = typeof l.name === "string" ? normalizeName(l.name).slice(0, MAX_NAME_LENGTH) : "";
    lists.push({ id: l.id, name: name || "List", symbols: cleanSymbols(l.symbols) });
  }
  if (lists.length === 0) return null;
  const currentId = typeof d.currentId === "string" && lists.some((l) => l.id === d.currentId) ? d.currentId : lists[0].id;
  return { currentId, lists };
}

/** Parse the old single-list blob (a JSON array of symbols). Null when unusable. */
export function parseV1(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? cleanSymbols(data) : null;
  } catch {
    return null;
  }
}

export type LoadSource = "v2" | "v1" | "default";

/**
 * v2 wins; otherwise the old single list becomes the list named "Default"
 * (even if it was emptied on purpose); otherwise a fresh Default list.
 */
export function loadState(
  rawV2: string | null,
  rawV1: string | null,
  defaultSymbols: string[],
): { state: WatchlistState; source: LoadSource } {
  const v2 = parseV2(rawV2);
  if (v2) return { state: v2, source: "v2" };
  const v1 = parseV1(rawV1);
  if (v1) return { state: initialState(v1), source: "v1" };
  return { state: initialState(defaultSymbols), source: "default" };
}

/** The JSON stored under the v2 key. */
export function serialize(state: WatchlistState): string {
  return JSON.stringify({ currentId: state.currentId, lists: state.lists });
}

// ---------- names ----------

/** Why this name can't be used, or null if it's fine. `excludeId` = the list being renamed. */
export function nameError(state: WatchlistState, name: string, excludeId?: string): string | null {
  const n = normalizeName(name);
  if (!n) return "Enter a name.";
  if (n.length > MAX_NAME_LENGTH) return `Keep names to ${MAX_NAME_LENGTH} characters or fewer.`;
  const clash = state.lists.some((l) => l.id !== excludeId && l.name.toLowerCase() === n.toLowerCase());
  return clash ? `You already have a list called "${n}".` : null;
}

/** "List 2", "List 3", … first one not taken. */
export function suggestName(state: WatchlistState): string {
  let n = state.lists.length + 1;
  while (nameError(state, `List ${n}`)) n += 1;
  return `List ${n}`;
}

// ---------- list operations ----------

/** Make `id` the current list. Unknown ids are ignored. */
export function selectList(state: WatchlistState, id: string): WatchlistState {
  if (id === state.currentId || !state.lists.some((l) => l.id === id)) return state;
  return { ...state, currentId: id };
}

/** Adds an empty list and makes it current. Unchanged state if the name is invalid. */
export function createList(state: WatchlistState, name: string, id: string): WatchlistState {
  if (nameError(state, name) || state.lists.some((l) => l.id === id)) return state;
  return { currentId: id, lists: [...state.lists, { id, name: normalizeName(name), symbols: [] }] };
}

/** Rename a list. Unchanged state if the name is invalid. */
export function renameList(state: WatchlistState, id: string, name: string): WatchlistState {
  if (nameError(state, name, id)) return state;
  const n = normalizeName(name);
  return mapList(state, id, (l) => (l.name === n ? l : { ...l, name: n }));
}

/** Removes a list. The last remaining list can't be deleted. If the current list goes, its neighbour becomes current. */
export function deleteList(state: WatchlistState, id: string): WatchlistState {
  const idx = state.lists.findIndex((l) => l.id === id);
  if (idx < 0 || state.lists.length <= 1) return state;
  const lists = state.lists.filter((l) => l.id !== id);
  const currentId = state.currentId === id ? lists[Math.max(0, idx - 1)].id : state.currentId;
  return { currentId, lists };
}

/**
 * Resets ONLY the list named "Default" (case-insensitive) to the starting
 * symbols. It goes by name, not id, so a list the user renamed away from
 * "Default" is never wiped. If no list is named Default, a new one is added
 * at the end. The current list is not changed either way.
 */
export function restoreDefault(state: WatchlistState, defaultSymbols: string[]): WatchlistState {
  const fresh = [...defaultSymbols];
  const named = state.lists.find((l) => l.name.toLowerCase() === DEFAULT_LIST_NAME.toLowerCase());
  if (named) {
    return mapList(state, named.id, (l) =>
      l.symbols.length === fresh.length && l.symbols.every((s, i) => s === fresh[i]) ? l : { ...l, symbols: fresh },
    );
  }
  // No list is named Default: add one, with an id that isn't already taken.
  let id = DEFAULT_LIST_ID;
  for (let n = 2; state.lists.some((l) => l.id === id); n += 1) id = `${DEFAULT_LIST_ID}-${n}`;
  return { ...state, lists: [...state.lists, { id, name: DEFAULT_LIST_NAME, symbols: fresh }] };
}

// ---------- symbols in the CURRENT list ----------

/** Replace the current list's symbols. */
export function setCurrentSymbols(state: WatchlistState, symbols: string[]): WatchlistState {
  const next = cleanSymbols(symbols);
  return mapList(state, currentList(state).id, (l) =>
    l.symbols.length === next.length && l.symbols.every((s, i) => s === next[i]) ? l : { ...l, symbols: next },
  );
}

/** Add a symbol to the current list (no duplicates). */
export function addSymbol(state: WatchlistState, symbol: string): WatchlistState {
  const u = symbol.trim().toUpperCase();
  if (!u) return state;
  return mapList(state, currentList(state).id, (l) => (l.symbols.includes(u) ? l : { ...l, symbols: [...l.symbols, u] }));
}

/** Remove a symbol from the current list. */
export function removeSymbol(state: WatchlistState, symbol: string): WatchlistState {
  const u = symbol.trim().toUpperCase();
  return mapList(state, currentList(state).id, (l) => (l.symbols.includes(u) ? { ...l, symbols: l.symbols.filter((x) => x !== u) } : l));
}

/** Add the symbol to the current list if missing, otherwise remove it. */
export function toggleSymbol(state: WatchlistState, symbol: string): WatchlistState {
  return currentList(state).symbols.includes(symbol.trim().toUpperCase())
    ? removeSymbol(state, symbol)
    : addSymbol(state, symbol);
}

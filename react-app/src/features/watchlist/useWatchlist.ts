import { useCallback, useSyncExternalStore } from "react";
import { defaultWatchlist } from "../../config/watchlist";
import {
  addSymbol,
  addSymbolTo,
  createList,
  currentList,
  deleteList,
  initialState,
  loadState,
  nameError,
  removeSymbol,
  removeSymbolFrom,
  renameList,
  restoreDefault,
  selectList,
  serialize,
  setCurrentSymbols,
  toggleSymbol,
  type WatchList,
  type WatchlistState,
} from "./lists";

export type { WatchList } from "./lists";
export { MAX_NAME_LENGTH, nameError, suggestName } from "./lists";

/** v2 = named lists. v1 (a bare array of symbols) is read once and migrated; it is never deleted. */
export const WATCHLIST_KEY = "bullpen.watchlist.v2";
export const LEGACY_WATCHLIST_KEY = "bullpen.watchlist.v1";

// ---------- one shared store ----------
// Every component that calls useWatchlist() (the Watch tab, Discover, the ☰
// menu, …) is mounted at the same time now that the list switcher exists, so
// they must all see the same state. A module-level store plus
// useSyncExternalStore keeps them in sync and makes each write start from the
// latest state, not from a stale per-component copy.

let state: WatchlistState | null = null;
const listeners = new Set<() => void>();

function persist(next: WatchlistState) {
  try {
    localStorage.setItem(WATCHLIST_KEY, serialize(next));
  } catch {
    /* best-effort (private mode / quota) */
  }
}

function read(): WatchlistState {
  try {
    const { state: loaded, source } = loadState(
      localStorage.getItem(WATCHLIST_KEY),
      localStorage.getItem(LEGACY_WATCHLIST_KEY),
      defaultWatchlist,
    );
    if (source !== "v2") persist(loaded); // first run after upgrade: write the migrated lists
    return loaded;
  } catch {
    return initialState(defaultWatchlist);
  }
}

function getSnapshot(): WatchlistState {
  if (state === null) state = read();
  return state;
}

function commit(next: WatchlistState) {
  if (next === getSnapshot()) return;
  state = next;
  persist(next);
  listeners.forEach((l) => l());
}

/** Another browser tab changed the lists. */
function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== WATCHLIST_KEY) return;
  state = read();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- actions (module-level: stable identity, always act on the latest state) ----------

const add = (s: string) => commit(addSymbol(getSnapshot(), s));
const remove = (s: string) => commit(removeSymbol(getSnapshot(), s));
const toggle = (s: string) => commit(toggleSymbol(getSnapshot(), s));
const setSymbols = (next: string[] | ((prev: string[]) => string[])) => {
  const cur = getSnapshot();
  commit(setCurrentSymbols(cur, typeof next === "function" ? next(currentList(cur).symbols) : next));
};
/** Add a symbol to a specific list, not the current one ("Add to…"). */
const addTo = (listId: string, s: string) => commit(addSymbolTo(getSnapshot(), listId, s));
/** Remove a symbol from a specific list, not the current one ("Add to…"). */
const removeFrom = (listId: string, s: string) => commit(removeSymbolFrom(getSnapshot(), listId, s));
const select = (id: string) => commit(selectList(getSnapshot(), id));
/** Creates an empty list and switches to it. Returns its id, or null if the name is empty / too long / already used. */
const create = (name: string): string | null => {
  const before = getSnapshot();
  if (nameError(before, name)) return null;
  const id = newId();
  commit(createList(before, name, id));
  return id;
};
/** Returns false (and changes nothing) if the name is empty / too long / already used. */
const rename = (id: string, name: string): boolean => {
  const before = getSnapshot();
  if (nameError(before, name, id)) return false;
  commit(renameList(before, id, name));
  return true;
};
/** Deletes a list (never the last one). */
const del = (id: string) => commit(deleteList(getSnapshot(), id));
/** Resets only the Default list to the starting symbols. */
const restoreDefaultList = () => commit(restoreDefault(getSnapshot(), defaultWatchlist));

/**
 * The user's named watchlists, persisted in localStorage.
 *
 * `symbols / add / remove / has / toggle / setSymbols` act on the CURRENT list,
 * exactly as before; `addTo / removeFrom` act on a list chosen by id;
 * `lists / current / select / create / rename / delete` manage the lists themselves.
 */
export function useWatchlist() {
  const st = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const current: WatchList = currentList(st);
  const symbols = current.symbols;
  const has = useCallback((s: string) => symbols.includes(s.toUpperCase()), [symbols]);
  return {
    // current list (unchanged API)
    symbols,
    setSymbols,
    has,
    add,
    remove,
    toggle,
    // a specific list
    addTo,
    removeFrom,
    // lists
    lists: st.lists,
    current,
    select,
    create,
    rename,
    delete: del,
    restoreDefault: restoreDefaultList,
  };
}

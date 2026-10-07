import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIST_ID,
  addSymbol,
  createList,
  currentList,
  deleteList,
  initialState,
  loadState,
  nameError,
  removeSymbol,
  renameList,
  restoreDefault,
  selectList,
  serialize,
  toggleSymbol,
} from "./lists";

const DEFAULTS = ["SPY", "QQQ", "AAPL"];

describe("loadState (migration)", () => {
  it("moves the old v1 list into a list named Default with nothing lost", () => {
    const { state, source } = loadState(null, JSON.stringify(["aapl", "MSFT", "NVDA"]), DEFAULTS);
    expect(source).toBe("v1");
    expect(state.lists).toHaveLength(1);
    expect(state.lists[0]).toMatchObject({ id: DEFAULT_LIST_ID, name: "Default", symbols: ["AAPL", "MSFT", "NVDA"] });
    expect(state.currentId).toBe(DEFAULT_LIST_ID);
  });

  it("keeps an old list that was emptied on purpose empty", () => {
    const { state } = loadState(null, "[]", DEFAULTS);
    expect(state.lists[0].symbols).toEqual([]);
  });

  it("uses the starting symbols when there is no saved data", () => {
    const { state, source } = loadState(null, null, DEFAULTS);
    expect(source).toBe("default");
    expect(state.lists[0].symbols).toEqual(DEFAULTS);
  });

  it("prefers v2 over v1", () => {
    const v2 = serialize({
      currentId: "b",
      lists: [
        { id: DEFAULT_LIST_ID, name: "Default", symbols: ["SPY"] },
        { id: "b", name: "Earnings", symbols: ["NVDA"] },
      ],
    });
    const { state, source } = loadState(v2, JSON.stringify(["TSLA"]), DEFAULTS);
    expect(source).toBe("v2");
    expect(state.currentId).toBe("b");
    expect(state.lists.map((l) => l.name)).toEqual(["Default", "Earnings"]);
  });

  it("falls back to v1 when v2 is corrupt", () => {
    const { state, source } = loadState("{not json", JSON.stringify(["TSLA"]), DEFAULTS);
    expect(source).toBe("v1");
    expect(state.lists[0].symbols).toEqual(["TSLA"]);
  });

  it("survives a save-and-reload round trip", () => {
    let s = initialState(DEFAULTS);
    s = createList(s, "Earnings", "e1");
    s = addSymbol(s, "nvda");
    const { state } = loadState(serialize(s), null, DEFAULTS);
    expect(state).toEqual(s);
  });
});

describe("list operations", () => {
  it("creates an empty list and switches to it", () => {
    const s = createList(initialState(DEFAULTS), "Earnings", "e1");
    expect(s.lists).toHaveLength(2);
    expect(currentList(s)).toMatchObject({ id: "e1", name: "Earnings", symbols: [] });
  });

  it("rejects blank and duplicate names (case-insensitive)", () => {
    const s = initialState(DEFAULTS);
    expect(nameError(s, "   ")).not.toBeNull();
    expect(nameError(s, "default")).not.toBeNull();
    expect(createList(s, "DEFAULT", "x")).toBe(s);
  });

  it("renames a list", () => {
    let s = createList(initialState(DEFAULTS), "Earnings", "e1");
    s = renameList(s, "e1", "  Tech   stocks ");
    expect(currentList(s).name).toBe("Tech stocks");
  });

  it("selects a list, and ignores unknown ids", () => {
    let s = createList(initialState(DEFAULTS), "Earnings", "e1");
    s = selectList(s, DEFAULT_LIST_ID);
    expect(s.currentId).toBe(DEFAULT_LIST_ID);
    expect(selectList(s, "nope")).toBe(s);
  });

  it("never deletes the last list", () => {
    const s = initialState(DEFAULTS);
    expect(deleteList(s, DEFAULT_LIST_ID)).toBe(s);
  });

  it("switches to a neighbour when the current list is deleted", () => {
    let s = createList(initialState(DEFAULTS), "Earnings", "e1");
    s = deleteList(s, "e1");
    expect(s.lists.map((l) => l.id)).toEqual([DEFAULT_LIST_ID]);
    expect(s.currentId).toBe(DEFAULT_LIST_ID);
  });
});

describe("symbols act only on the current list", () => {
  it("add / remove / toggle leave other lists alone", () => {
    let s = createList(initialState(DEFAULTS), "Earnings", "e1");
    s = addSymbol(s, "nvda");
    s = addSymbol(s, "NVDA"); // no duplicates
    expect(currentList(s).symbols).toEqual(["NVDA"]);

    s = toggleSymbol(s, "TSLA");
    expect(currentList(s).symbols).toEqual(["NVDA", "TSLA"]);
    s = removeSymbol(s, "nvda");
    expect(currentList(s).symbols).toEqual(["TSLA"]);

    const def = s.lists.find((l) => l.id === DEFAULT_LIST_ID)!;
    expect(def.symbols).toEqual(DEFAULTS);
  });
});

describe("restoreDefault", () => {
  it("resets only Default and keeps the current list", () => {
    let s = initialState(DEFAULTS);
    s = removeSymbol(s, "SPY"); // change Default
    s = createList(s, "Earnings", "e1");
    s = addSymbol(s, "NVDA");

    s = restoreDefault(s, DEFAULTS);
    expect(s.lists.find((l) => l.id === DEFAULT_LIST_ID)!.symbols).toEqual(DEFAULTS);
    expect(s.lists.find((l) => l.id === "e1")!.symbols).toEqual(["NVDA"]);
    expect(s.currentId).toBe("e1");
  });

  it("brings Default back if it was deleted", () => {
    let s = createList(initialState(DEFAULTS), "Earnings", "e1");
    s = deleteList(s, DEFAULT_LIST_ID);
    s = restoreDefault(s, DEFAULTS);
    const def = s.lists.find((l) => l.id === DEFAULT_LIST_ID)!;
    expect(def).toMatchObject({ name: "Default", symbols: DEFAULTS });
    expect(s.currentId).toBe("e1");
  });
});

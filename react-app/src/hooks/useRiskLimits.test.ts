import { describe, expect, it } from "vitest";
import { riskLimits as defaults, type RiskLimits } from "../config/risk";
import {
  mergeRiskLimits,
  parseRiskLimitsDraft,
  sameRiskLimits,
  toRiskLimitsDraft,
  type RiskLimitsDraft,
} from "./useRiskLimits";

const D: RiskLimits = {
  maxOrderNotional: 5_000,
  maxPositionNotional: 10_000,
  maxOrderQty: 500,
  maxDailyLoss: 2_000,
  allowShort: false,
  requireMarketOpen: false,
  blockedSymbols: [],
};

describe("mergeRiskLimits (stored over defaults)", () => {
  it("returns the config/risk.ts defaults when nothing is stored", () => {
    expect(mergeRiskLimits(null)).toEqual(defaults);
    expect(mergeRiskLimits(undefined)).toEqual(defaults);
  });

  it("returns a copy, never the defaults object itself", () => {
    const m = mergeRiskLimits(null, D);
    expect(m).not.toBe(D);
    expect(m.blockedSymbols).not.toBe(D.blockedSymbols);
  });

  it("stored values win over defaults", () => {
    const stored: RiskLimits = {
      maxOrderNotional: 1_000,
      maxPositionNotional: 3_000,
      maxOrderQty: 50,
      maxDailyLoss: 250,
      allowShort: true,
      requireMarketOpen: true,
      blockedSymbols: ["GME"],
    };
    expect(mergeRiskLimits(stored, D)).toEqual(stored);
  });

  it("fills fields missing from storage with their defaults", () => {
    expect(mergeRiskLimits({ maxOrderQty: 10, requireMarketOpen: true }, D)).toEqual({
      ...D,
      maxOrderQty: 10,
      requireMarketOpen: true,
    });
  });

  it("ignores corrupt or out-of-range stored fields instead of loosening the guard", () => {
    const m = mergeRiskLimits(
      {
        maxOrderNotional: "9999999",
        maxPositionNotional: -1,
        maxOrderQty: 2.5,
        maxDailyLoss: Number.NaN,
        allowShort: "yes",
        requireMarketOpen: 1,
        blockedSymbols: "TSLA",
      },
      D,
    );
    expect(m).toEqual(D);
  });

  it("ignores storage that isn't an object", () => {
    expect(mergeRiskLimits("oops", D)).toEqual(D);
    expect(mergeRiskLimits(42, D)).toEqual(D);
    expect(mergeRiskLimits([1, 2], D)).toEqual(D);
  });

  it("normalizes stored blocked symbols and drops invalid ones", () => {
    expect(mergeRiskLimits({ blockedSymbols: [" tsla", "TSLA", "brk.b", "not a ticker", ""] }, D).blockedSymbols).toEqual([
      "TSLA",
      "BRK.B",
    ]);
  });
});

describe("parseRiskLimitsDraft (form validation)", () => {
  const draft = (over: Partial<RiskLimitsDraft> = {}): RiskLimitsDraft => ({ ...toRiskLimitsDraft(D), ...over });

  it("round-trips valid limits", () => {
    const r = parseRiskLimitsDraft(toRiskLimitsDraft(D));
    expect(r).toEqual({ ok: true, limits: D });
  });

  it("accepts money written with commas and a dollar sign", () => {
    const r = parseRiskLimitsDraft(draft({ maxOrderNotional: "$2,500", maxPositionNotional: " 7,500.50 " }));
    expect(r.ok && r.limits.maxOrderNotional).toBe(2_500);
    expect(r.ok && r.limits.maxPositionNotional).toBe(7_500.5);
  });

  it("rejects negative numbers", () => {
    const r = parseRiskLimitsDraft(draft({ maxDailyLoss: "-100" }));
    expect(r).toEqual({ ok: false, errors: { maxDailyLoss: "Can't be negative" } });
  });

  it("rejects non-numbers and blanks", () => {
    const r = parseRiskLimitsDraft(draft({ maxOrderQty: "lots", maxDailyLoss: "  " }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.maxOrderQty).toBe("Enter a number");
      expect(r.errors.maxDailyLoss).toBe("Required");
    }
  });

  it("rejects zero and fractional share counts", () => {
    expect(parseRiskLimitsDraft(draft({ maxOrderNotional: "0" }))).toEqual({
      ok: false,
      errors: { maxOrderNotional: "Must be more than 0" },
    });
    expect(parseRiskLimitsDraft(draft({ maxOrderQty: "1.5" }))).toEqual({
      ok: false,
      errors: { maxOrderQty: "Whole shares only" },
    });
  });

  it("rejects maxOrderNotional > maxPositionNotional", () => {
    const r = parseRiskLimitsDraft(draft({ maxOrderNotional: "20000", maxPositionNotional: "10000" }));
    expect(r).toEqual({ ok: false, errors: { maxOrderNotional: "Can't be more than the max position" } });
  });

  it("allows maxOrderNotional equal to maxPositionNotional", () => {
    expect(parseRiskLimitsDraft(draft({ maxOrderNotional: "10000" })).ok).toBe(true);
  });

  it("reports every invalid field at once", () => {
    const r = parseRiskLimitsDraft(draft({ maxOrderNotional: "-1", maxOrderQty: "x", blockedSymbols: "AAPL, $$$" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["blockedSymbols", "maxOrderNotional", "maxOrderQty"]);
  });

  it("splits, uppercases and de-duplicates blocked symbols", () => {
    const r = parseRiskLimitsDraft(draft({ blockedSymbols: "tsla, gme  TSLA;brk.b," }));
    expect(r.ok && r.limits.blockedSymbols).toEqual(["TSLA", "GME", "BRK.B"]);
  });

  it("rejects invalid tickers", () => {
    const r = parseRiskLimitsDraft(draft({ blockedSymbols: "AAPL, 123ABC" }));
    expect(r).toEqual({ ok: false, errors: { blockedSymbols: "Not a valid ticker: 123ABC" } });
  });
});

describe("sameRiskLimits", () => {
  it("compares every field, including the symbol list", () => {
    expect(sameRiskLimits(D, { ...D, blockedSymbols: [] })).toBe(true);
    expect(sameRiskLimits(D, { ...D, maxOrderQty: 499 })).toBe(false);
    expect(sameRiskLimits(D, { ...D, allowShort: true })).toBe(false);
    expect(sameRiskLimits(D, { ...D, blockedSymbols: ["GME"] })).toBe(false);
  });
});

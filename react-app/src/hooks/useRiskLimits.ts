import { useCallback, useMemo } from "react";
import { riskLimits as defaultRiskLimits, type RiskLimits } from "../config/risk";
import { useLocalStorage } from "./useLocalStorage";

/** localStorage key for the limits a user set in Settings (per device). */
export const RISK_LIMITS_KEY = "bullpen.riskLimits.v1";

export const NUMBER_FIELDS = ["maxOrderNotional", "maxPositionNotional", "maxOrderQty", "maxDailyLoss"] as const;
export type RiskNumberField = (typeof NUMBER_FIELDS)[number];
const BOOLEAN_FIELDS = ["allowShort", "requireMarketOpen"] as const;

/** Same shape the risk guard accepts for a symbol. */
const SYMBOL_RE = /^[A-Z][A-Z0-9.]{0,9}$/;

const isPositiveNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

/**
 * Effective limits = stored values over the `config/risk.ts` defaults.
 *
 * Pure and defensive: `stored` is whatever came out of localStorage, so any
 * field that is missing, the wrong type or out of range falls back to its
 * default instead of loosening (or breaking) the guard. Fields added to
 * `RiskLimits` later pick up their default automatically.
 */
export function mergeRiskLimits(stored: unknown, defaults: RiskLimits = defaultRiskLimits): RiskLimits {
  const out: RiskLimits = { ...defaults, blockedSymbols: [...defaults.blockedSymbols] };
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return out;
  const s = stored as Record<string, unknown>;

  for (const k of NUMBER_FIELDS) {
    const v = s[k];
    if (isPositiveNumber(v) && (k !== "maxOrderQty" || Number.isInteger(v))) out[k] = v;
  }
  for (const k of BOOLEAN_FIELDS) {
    const v = s[k];
    if (typeof v === "boolean") out[k] = v;
  }
  const b = s.blockedSymbols;
  if (Array.isArray(b) && b.every((x) => typeof x === "string")) {
    out.blockedSymbols = normalizeSymbols(b as string[]).filter((x) => SYMBOL_RE.test(x));
  }
  return out;
}

/** True when two limit sets would make the guard behave identically. */
export function sameRiskLimits(a: RiskLimits, b: RiskLimits): boolean {
  return (
    NUMBER_FIELDS.every((k) => a[k] === b[k]) &&
    BOOLEAN_FIELDS.every((k) => a[k] === b[k]) &&
    a.blockedSymbols.length === b.blockedSymbols.length &&
    a.blockedSymbols.every((s, i) => s === b.blockedSymbols[i])
  );
}

function normalizeSymbols(list: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of list) {
    const s = raw.trim().toUpperCase();
    if (s) seen.add(s);
  }
  return [...seen];
}

/* ------------------------------------------------------------------ */
/* Form <-> limits                                                     */
/* ------------------------------------------------------------------ */

/** What the Settings form edits: numbers and the symbol list as raw text. */
export type RiskLimitsDraft = Record<RiskNumberField, string> & {
  allowShort: boolean;
  requireMarketOpen: boolean;
  /** Comma- or space-separated tickers. */
  blockedSymbols: string;
};

export type RiskLimitsErrors = Partial<Record<keyof RiskLimits, string>>;

export type ParseResult = { ok: true; limits: RiskLimits } | { ok: false; errors: RiskLimitsErrors };

export function toRiskLimitsDraft(l: RiskLimits): RiskLimitsDraft {
  return {
    maxOrderNotional: String(l.maxOrderNotional),
    maxPositionNotional: String(l.maxPositionNotional),
    maxOrderQty: String(l.maxOrderQty),
    maxDailyLoss: String(l.maxDailyLoss),
    allowShort: l.allowShort,
    requireMarketOpen: l.requireMarketOpen,
    blockedSymbols: l.blockedSymbols.join(", "),
  };
}

/**
 * Validate the form. Every problem is reported (one message per field) so
 * the user can fix them all at once; nothing is returned to save unless the
 * whole draft is valid.
 */
export function parseRiskLimitsDraft(d: RiskLimitsDraft): ParseResult {
  const errors: RiskLimitsErrors = {};
  const nums = {} as Record<RiskNumberField, number>;

  for (const k of NUMBER_FIELDS) {
    // Allow "5,000" and "$5,000" — that's how people write money.
    const text = d[k].trim().replace(/[,$\s]/g, "");
    if (text === "") {
      errors[k] = "Required";
      continue;
    }
    const n = /^[+-]?(\d+\.?\d*|\.\d+)$/.test(text) ? Number(text) : NaN;
    if (!Number.isFinite(n)) errors[k] = "Enter a number";
    else if (n < 0) errors[k] = "Can't be negative";
    else if (n === 0) errors[k] = "Must be more than 0";
    else if (k === "maxOrderQty" && !Number.isInteger(n)) errors[k] = "Whole shares only";
    else nums[k] = n;
  }

  if (
    errors.maxOrderNotional === undefined &&
    errors.maxPositionNotional === undefined &&
    nums.maxOrderNotional > nums.maxPositionNotional
  ) {
    errors.maxOrderNotional = "Can't be more than the max position";
  }

  const symbols = normalizeSymbols(d.blockedSymbols.split(/[\s,;]+/));
  const bad = symbols.filter((s) => !SYMBOL_RE.test(s));
  if (bad.length) errors.blockedSymbols = `Not a valid ticker: ${bad.join(", ")}`;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    limits: {
      ...nums,
      allowShort: d.allowShort,
      requireMarketOpen: d.requireMarketOpen,
      blockedSymbols: symbols,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * The effective risk limits for this device: what the user saved in
 * Settings, over the `config/risk.ts` defaults. Like `useWatchlist`, each
 * mount reads storage fresh, so a screen opened after Settings sees the
 * latest values.
 */
export function useRiskLimits() {
  // null = nothing saved (or restored to defaults).
  const [stored, setStored] = useLocalStorage<unknown>(RISK_LIMITS_KEY, null);
  const limits = useMemo(() => mergeRiskLimits(stored), [stored]);
  const isCustom = useMemo(() => !sameRiskLimits(limits, defaultRiskLimits), [limits]);

  const saveLimits = useCallback((next: RiskLimits) => setStored(next), [setStored]);
  const restoreDefaults = useCallback(() => setStored(null), [setStored]);

  return { limits, defaults: defaultRiskLimits, isCustom, saveLimits, restoreDefaults };
}

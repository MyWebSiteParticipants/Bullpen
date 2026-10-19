import type { Account, Clock, OrderIntent, Position } from "../broker/types";
import type { RiskLimits } from "../config/risk";

/** Everything the guard needs to know about the world right now. */
export interface RiskContext {
  account: Account;
  positions: Position[];
  clock: Clock;
  /** Best available price for the symbol (last trade, or limit price as fallback). */
  referencePrice?: number;
}

export interface RiskVerdict {
  ok: boolean;
  violations: string[];
  warnings: string[];
  notional: number;
  checks: {
    rule: string;
    limit: string | number;
    value: string | number;
    ok: boolean;
  }[];
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * Pure function: no I/O, fully unit-testable. Returns every violation it can
 * find rather than stopping at the first, so the user sees the whole picture.
 */
export function evaluateRisk(intent: OrderIntent, ctx: RiskContext, limits: RiskLimits): RiskVerdict {
  const violations: string[] = [];
  const warnings: string[] = [];
  const checks: RiskVerdict["checks"] = [];

  const symbol = intent.symbol.trim().toUpperCase();
  const price =
    ctx.referencePrice ??
    intent.limitPrice ??
    intent.stopPrice ??
    ctx.positions.find((p) => p.symbol === symbol)?.currentPrice ??
    0;
  const notional = intent.qty * price;

  /* --- Basic sanity --- */
  if (!/^[A-Z][A-Z0-9.]{0,9}$/.test(symbol)) violations.push(`"${intent.symbol}" is not a valid symbol`);
  if (!Number.isFinite(intent.qty) || intent.qty <= 0) violations.push("Quantity must be a positive number");
  if (!Number.isInteger(intent.qty)) violations.push("Whole shares only (fractional orders are disabled)");
  if (!intent.reason || intent.reason.trim().length < 3) violations.push("A reason is required (the journal needs it)");
  if ((intent.type === "limit" || intent.type === "stop_limit") && !(intent.limitPrice && intent.limitPrice > 0))
    violations.push("Limit orders need a limit price");
  if ((intent.type === "stop" || intent.type === "stop_limit") && !(intent.stopPrice && intent.stopPrice > 0))
    violations.push("Stop orders need a stop price");
  if (price <= 0) violations.push("No reference price available to size this order");

  /* --- Blocklist (Check 1) --- */
  const isBlocked = limits.blockedSymbols.map((s) => s.toUpperCase()).includes(symbol);
  checks.push({ rule: "Blocklist", limit: "None", value: isBlocked ? "Blocked" : "Clear", ok: !isBlocked });
  if (isBlocked) violations.push(`${symbol} is on the blocked list`);

  /* --- Market hours (Check 2) --- */
  const marketOk = !limits.requireMarketOpen || ctx.clock.isOpen;
  checks.push({ rule: "Market hours", limit: limits.requireMarketOpen ? "Open" : "Any", value: ctx.clock.isOpen ? "Open" : "Closed", ok: marketOk });
  if (!ctx.clock.isOpen) {
    if (limits.requireMarketOpen) violations.push("Market is closed (requireMarketOpen is on)");
    else warnings.push("Market is closed — this order will queue for the next open");
  }

  /* --- Account state & Daily loss (Check 3) --- */
  if (ctx.account.status !== "ACTIVE") violations.push(`Account status is ${ctx.account.status}`);
  const dailyPl = ctx.account.equity - ctx.account.lastEquity;
  const dailyLossOk = intent.side !== "buy" || -dailyPl <= limits.maxDailyLoss;
  checks.push({ rule: "Daily loss", limit: limits.maxDailyLoss, value: Math.max(0, -dailyPl), ok: dailyLossOk });
  if (!dailyLossOk)
    violations.push(`Daily loss ${money(-dailyPl)} exceeds the ${money(limits.maxDailyLoss)} limit — no new buys today`);

  /* --- Size limits (Checks 4 & 5) --- */
  const qtyOk = intent.qty <= limits.maxOrderQty;
  checks.push({ rule: "Max qty", limit: limits.maxOrderQty, value: intent.qty, ok: qtyOk });
  if (!qtyOk) violations.push(`Quantity ${intent.qty} exceeds max ${limits.maxOrderQty} shares`);

  const notionalOk = notional <= limits.maxOrderNotional;
  checks.push({ rule: "Max order value", limit: limits.maxOrderNotional, value: notional, ok: notionalOk });
  if (!notionalOk)
    violations.push(`Order value ${money(notional)} exceeds max ${money(limits.maxOrderNotional)}`);

  /* --- Position & Shorting (Checks 6 & 7) --- */
  const held = ctx.positions.find((p) => p.symbol === symbol)?.qty ?? 0;
  
  const positionOk = intent.side !== "buy" || ((held + intent.qty) * price) <= limits.maxPositionNotional;
  checks.push({ rule: "Max position", limit: limits.maxPositionNotional, value: intent.side === "buy" ? (held + intent.qty) * price : held * price, ok: positionOk });
  
  const shortingOk = intent.side === "buy" || limits.allowShort || intent.qty <= held;
  checks.push({ rule: "Shorting", limit: limits.allowShort ? "Allowed" : "Not allowed", value: intent.side === "buy" ? "Buy" : (intent.qty > held ? "Short" : "Sell"), ok: shortingOk });

  if (intent.side === "buy") {
    const after = (held + intent.qty) * price;
    if (!positionOk)
      violations.push(`Position would be ${money(after)}, above the ${money(limits.maxPositionNotional)} per-symbol cap`);
    if (notional > ctx.account.buyingPower)
      violations.push(`Order value ${money(notional)} exceeds buying power ${money(ctx.account.buyingPower)}`);
  } else {
    if (!shortingOk)
      violations.push(
        held === 0 ? `You don't hold ${symbol} (shorting is off)` : `You hold ${held} ${symbol}; can't sell ${intent.qty}`,
      );
  }

  /* --- Soft notes --- */
  if (intent.type === "market" && !ctx.clock.isOpen)
    warnings.push("Market order while closed fills at the open, wherever that is — consider a limit");
  if (ctx.account.dayTradeCount >= 3 && ctx.account.equity < 25_000)
    warnings.push("3+ day trades in 5 days: one more could flag the account as a pattern day trader");

  return { ok: violations.length === 0, violations, warnings, notional, checks };
}
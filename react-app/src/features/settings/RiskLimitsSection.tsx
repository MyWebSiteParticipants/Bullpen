import { useMemo, useState, type FormEvent } from "react";
import {
  parseRiskLimitsDraft,
  sameRiskLimits,
  toRiskLimitsDraft,
  useRiskLimits,
  type RiskLimitsDraft,
  type RiskNumberField,
} from "../../hooks/useRiskLimits";
import { fmtMoney } from "../../lib/format";

const NUMBER_INPUTS: { key: RiskNumberField; label: string; money: boolean }[] = [
  { key: "maxOrderNotional", label: "Max per order ($)", money: true },
  { key: "maxPositionNotional", label: "Max per position ($)", money: true },
  { key: "maxOrderQty", label: "Max shares per order", money: false },
  { key: "maxDailyLoss", label: "Daily loss stop ($)", money: true },
];

/**
 * Settings → Risk limits. Edits the per-device overrides behind
 * `useRiskLimits()`; the defaults come from `config/risk.ts`. Nothing is
 * saved while any field is invalid.
 */
export function RiskLimitsSection() {
  const { limits, defaults, isCustom, saveLimits, restoreDefaults } = useRiskLimits();
  const [draft, setDraft] = useState<RiskLimitsDraft>(() => toRiskLimitsDraft(limits));
  const [notice, setNotice] = useState<string>();

  const parsed = useMemo(() => parseRiskLimitsDraft(draft), [draft]);
  const errors = parsed.ok ? {} : parsed.errors;
  const dirty = !parsed.ok || !sameRiskLimits(parsed.limits, limits);

  const edit = <K extends keyof RiskLimitsDraft>(k: K, v: RiskLimitsDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setNotice(undefined);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.ok) return;
    saveLimits(parsed.limits);
    setDraft(toRiskLimitsDraft(parsed.limits)); // show the normalized values ("5,000" → "5000")
    setNotice("Saved on this device.");
  };

  const restore = () => {
    restoreDefaults();
    setDraft(toRiskLimitsDraft(defaults));
    setNotice("Defaults restored.");
  };

  const atDefaults = !isCustom && parsed.ok && sameRiskLimits(parsed.limits, defaults);

  return (
    <div className="card">
      <div className="card__title">
        <span>Risk limits</span>
        <span className={`pill ${isCustom ? "pill--ok" : "pill--muted"}`}>{isCustom ? "Custom" : "Defaults"}</span>
      </div>
      <div className="sub" style={{ marginBottom: 10 }}>
        Every order, manual or automated, is checked against these before it reaches Alpaca. Set them while you're calm.
        Stored only in this browser.
      </div>

      <form onSubmit={save} autoComplete="off" noValidate>
        <div className="field-row">
          {NUMBER_INPUTS.map(({ key, label, money }) => {
            const err = errors[key];
            const id = `risk-${key}`;
            const def = money ? fmtMoney(defaults[key], 0) : defaults[key].toLocaleString("en-US");
            return (
              <div key={key} className={`field${err ? " field--invalid" : ""}`}>
                <label htmlFor={id}>{label}</label>
                <input
                  id={id}
                  type="text"
                  inputMode={key === "maxOrderQty" ? "numeric" : "decimal"}
                  value={draft[key]}
                  onChange={(e) => edit(key, e.target.value)}
                  aria-invalid={err ? true : undefined}
                  aria-describedby={`${id}-hint`}
                />
                <span id={`${id}-hint`} className={`field-hint${err ? " field-hint--missing" : ""}`} role={err ? "alert" : undefined}>
                  {err ?? `Default ${def}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Not .field: its input styles (min-height, padding) would inflate the checkboxes. */}
        <div style={{ display: "grid", gap: 12, margin: "4px 0 14px", fontSize: 14 }}>
          <label className="check">
            <input type="checkbox" checked={draft.allowShort} onChange={(e) => edit("allowShort", e.target.checked)} />
            Allow short selling
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.requireMarketOpen}
              onChange={(e) => edit("requireMarketOpen", e.target.checked)}
            />
            Only allow orders while the market is open
          </label>
        </div>

        <div className={`field${errors.blockedSymbols ? " field--invalid" : ""}`}>
          <label htmlFor="risk-blockedSymbols">Blocked symbols</label>
          <input
            id="risk-blockedSymbols"
            type="text"
            value={draft.blockedSymbols}
            onChange={(e) => edit("blockedSymbols", e.target.value)}
            placeholder="e.g. TSLA, GME"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={errors.blockedSymbols ? true : undefined}
            aria-describedby="risk-blockedSymbols-hint"
          />
          <span
            id="risk-blockedSymbols-hint"
            className={`field-hint${errors.blockedSymbols ? " field-hint--missing" : ""}`}
            role={errors.blockedSymbols ? "alert" : undefined}
          >
            {errors.blockedSymbols ?? "Comma-separated. These can never be traded."}
          </span>
        </div>

        <div className="field-row">
          <button className="btn" type="submit" disabled={!parsed.ok || !dirty}>
            Save limits
          </button>
          <button className="btn btn--ghost" type="button" onClick={restore} disabled={atDefaults}>
            Restore defaults
          </button>
        </div>
        {!parsed.ok && <div className="field-hint field-hint--missing" style={{ marginTop: 8 }}>Fix the highlighted fields to save.</div>}
      </form>

      {notice && (
        <div className="verdict verdict--ok" style={{ marginBottom: 0 }}>
          {notice}
        </div>
      )}
    </div>
  );
}

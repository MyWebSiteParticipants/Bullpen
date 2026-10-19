import type { ReactNode } from "react";
import { useSymbolIndex } from "../../app/SymbolIndexContext";
import type { Quote } from "../../broker/types";
import { fmtMoney, fmtPct, fmtSigned, signClass } from "../../lib/format";
import { AddToMenu } from "../watchlist/AddToMenu";

interface RowProps {
  symbol: string;
  label?: string;
  sub?: ReactNode;
  right: ReactNode;
  /** Whether the symbol is in the CURRENT watchlist. */
  inList: boolean;
  onSelect: (symbol: string) => void;
  /** Adds to / removes from the CURRENT watchlist. */
  onToggle: (symbol: string) => void;
}

/** Hoisted (not defined inside Discover) so polling re-renders don't remount every row. */
export function Row({ symbol, label, sub, right, inList, onSelect, onToggle }: RowProps) {
  const { nameOf } = useSymbolIndex();
  const name = label ?? nameOf(symbol);
  return (
    <div className="row row--tap" onClick={() => onSelect(symbol)}>
      <div className="row__main">
        <div className="sym-line">
          <span className="sym">{symbol}</span>
          {name && <span className="sym-name">{name}</span>}
        </div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="num">{right}</div>
      <button
        type="button"
        className={`add-btn ${inList ? "add-btn--in" : ""}`}
        title={inList ? "Remove from current watchlist" : "Add to current watchlist"}
        aria-label={inList ? `Remove ${symbol} from current watchlist` : `Add ${symbol} to current watchlist`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(symbol);
        }}
      >
        {inList ? "✓" : "+"}
      </button>
      <AddToMenu symbol={symbol} />
    </div>
  );
}

/** Last price with today's change, from a live quote or a snapshot. */
export function PriceCell({ q, price, change, changePct }: { q?: Quote; price?: number; change?: number; changePct?: number }) {
  const p = q?.last ?? price;
  const c = q?.change ?? change;
  const cp = q?.changePct ?? changePct;
  return (
    <>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{p !== undefined ? fmtMoney(p) : "—"}</div>
      <div className={`sub ${signClass(c)}`}>{c !== undefined ? `${fmtSigned(c)} (${fmtPct(cp)})` : ""}</div>
    </>
  );
}

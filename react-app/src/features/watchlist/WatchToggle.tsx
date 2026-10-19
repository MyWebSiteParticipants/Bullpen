import { AddToMenu } from "./AddToMenu";
import { useWatchlist } from "./useWatchlist";

/**
 * +/✓ for the CURRENT list plus the ⋯ "Add to…" menu for the others.
 * Used in the symbol detail panel's header bar (#17).
 */
export function WatchToggle({ symbol }: { symbol: string }) {
  const { has, toggle, current } = useWatchlist();
  const inList = has(symbol);
  return (
    <div className="watch-toggle">
      <button
        type="button"
        className={`add-btn ${inList ? "add-btn--in" : ""}`}
        title={inList ? `Remove from ${current.name}` : `Add to ${current.name}`}
        aria-label={inList ? `Remove ${symbol} from ${current.name}` : `Add ${symbol} to ${current.name}`}
        onClick={() => toggle(symbol)}
      >
        {inList ? "✓" : "+"}
      </button>
      <AddToMenu symbol={symbol} />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useWatchlist } from "./useWatchlist";
import "./addToMenu.css";

/**
 * The ⋯ button next to a +/✓ toggle. It opens "Add to…" with the user's
 * OTHER lists (the +/✓ already covers the current one), each with its own
 * +/✓ so a symbol can be added to or removed from any list without switching.
 * Renders nothing when there is only one list.
 */
export function AddToMenu({ symbol }: { symbol: string }) {
  const { lists, current, addTo, removeFrom } = useWatchlist();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sym = symbol.toUpperCase();
  const others = lists.filter((l) => l.id !== current.id);

  // Close on a tap outside the menu, or on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (others.length === 0) return null;

  return (
    // stopPropagation: rows open the detail panel when tapped; the menu must not.
    <div className="addto" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="add-btn addto__more"
        title="Add to another list"
        aria-label={`Add ${sym} to another list`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <div className="card addto__menu" role="menu">
          <div className="sub addto__title">Add {sym} to…</div>
          {others.map((l) => {
            const inIt = l.symbols.includes(sym);
            return (
              <button
                key={l.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={inIt}
                className="addto__item"
                onClick={() => (inIt ? removeFrom(l.id, sym) : addTo(l.id, sym))}
              >
                <span className={`add-btn ${inIt ? "add-btn--in" : ""}`} aria-hidden="true">
                  {inIt ? "✓" : "+"}
                </span>
                <span className="addto__name">{l.name}</span>
                <span className="sub">{l.symbols.length}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

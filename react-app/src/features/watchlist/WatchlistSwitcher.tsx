import { useEffect, useId, useState, type FormEvent } from "react";
import { MAX_NAME_LENGTH, nameError, suggestName, useWatchlist } from "./useWatchlist";

/**
 * List switcher for the Watch tab: a dropdown of the user's lists plus a
 * "Manage" panel (New list, Rename, Delete with a two-tap confirm).
 * A native <select> is used on purpose — it stays usable at phone width and
 * never overflows the way a row of tabs would with many or long names.
 */
export function WatchlistSwitcher() {
  const { lists, current, select, create, rename, delete: deleteList } = useWatchlist();
  const [managing, setManaging] = useState(false);
  const [renameDraft, setRenameDraft] = useState(current.name);
  const [newDraft, setNewDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const panelId = useId();
  const renameId = useId();
  const newId = useId();

  const snapshot = { currentId: current.id, lists };
  const onlyList = lists.length <= 1;

  // Switching lists (or renaming) starts the panel fresh.
  useEffect(() => {
    setRenameDraft(current.name);
    setRenameError(null);
    setConfirmDelete(false);
  }, [current.id, current.name]);

  // The first Delete tap arms the button; it disarms itself after a few seconds.
  useEffect(() => {
    if (!confirmDelete) return;
    const t = window.setTimeout(() => setConfirmDelete(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmDelete]);

  const submitRename = (e: FormEvent) => {
    e.preventDefault();
    const err = nameError(snapshot, renameDraft, current.id);
    setRenameError(err);
    if (!err) rename(current.id, renameDraft);
  };

  const submitCreate = (e: FormEvent) => {
    e.preventDefault();
    const name = newDraft.trim() || suggestName(snapshot);
    const err = nameError(snapshot, name);
    setCreateError(err);
    if (err) return;
    create(name);
    setNewDraft("");
    setManaging(false);
  };

  const tapDelete = () => {
    if (onlyList) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteList(current.id);
    setConfirmDelete(false);
  };

  return (
    <div className="list-switcher">
      <div className="list-switcher__bar">
        <select aria-label="Watchlist" value={current.id} onChange={(e) => select(e.target.value)}>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.symbols.length})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn--ghost"
          aria-expanded={managing}
          aria-controls={panelId}
          onClick={() => setManaging((v) => !v)}
        >
          {managing ? "Close" : "Manage"}
        </button>
      </div>

      {managing && (
        <div className="card list-switcher__panel" id={panelId}>
          <form className="list-switcher__row" onSubmit={submitRename}>
            <label htmlFor={renameId}>Rename this list</label>
            <input
              id={renameId}
              value={renameDraft}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
              onChange={(e) => {
                setRenameDraft(e.target.value);
                setRenameError(null);
              }}
            />
            <button type="submit" className="btn btn--ghost">
              Rename
            </button>
            {renameError && (
              <div className="field-hint field-hint--missing list-switcher__msg" role="alert">
                {renameError}
              </div>
            )}
          </form>

          <form className="list-switcher__row" onSubmit={submitCreate}>
            <label htmlFor={newId}>New list</label>
            <input
              id={newId}
              value={newDraft}
              maxLength={MAX_NAME_LENGTH}
              placeholder={suggestName(snapshot)}
              autoComplete="off"
              onChange={(e) => {
                setNewDraft(e.target.value);
                setCreateError(null);
              }}
            />
            <button type="submit" className="btn btn--ghost">
              Create
            </button>
            {createError && (
              <div className="field-hint field-hint--missing list-switcher__msg" role="alert">
                {createError}
              </div>
            )}
          </form>

          <button
            type="button"
            className="btn btn--danger list-switcher__delete"
            disabled={onlyList}
            onClick={tapDelete}
          >
            {confirmDelete
              ? `Tap again to delete “${current.name}” (${current.symbols.length} symbols)`
              : `Delete “${current.name}”`}
          </button>
          {onlyList && <div className="field-hint list-switcher__msg">You need at least one list.</div>}
        </div>
      )}
    </div>
  );
}

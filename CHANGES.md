# Changes

## Unreleased

- **Add to any watchlist (#17).** The +/✓ on Discover and By location rows adds
  to and removes from the current list, and ✓ reflects the current list only.
  The symbol detail panel now has the same toggle in its header bar. A ⋯ next
  to each toggle opens *Add to…* with your other lists.
- **Multiple watchlists (#16).** The Watch tab now has a list switcher with
  New list, Rename and Delete (tap twice to confirm). Lists are saved locally
  under `bullpen.watchlist.v2`; the existing watchlist moves into a list named
  **Default** with nothing lost. ☰ → Tools → *Restore default watchlist* now
  resets only the list named Default. Unit tests in `features/watchlist/lists.test.ts`.

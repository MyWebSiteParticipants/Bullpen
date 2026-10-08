# Changes

## Unreleased

- **Multiple watchlists (#16).** The Watch tab now has a list switcher with
  New list, Rename and Delete (tap twice to confirm). Lists are saved locally
  under `bullpen.watchlist.v2`; the existing watchlist moves into a list named
  **Default** with nothing lost. ☰ → Tools → *Restore default watchlist* now
  resets only the list named Default. Unit tests in `features/watchlist/lists.test.ts`.

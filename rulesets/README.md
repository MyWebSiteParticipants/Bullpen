# Branch rulesets

Exported/importable GitHub rulesets for this repository. One per protected
branch so the two policies stay readable.

| File | Branch | Rules |
| --- | --- | --- |
| `protect-dev.json` | `dev` | PR required, 1 approval, stale approvals dismissed, `app` + `relay` status checks (from `ci.yml`) required and up to date, no force-push, no deletion |
| `protect-main.json` | `main` | same |

Bypass: repository admins only (Product Owner) — for merging a release
back into `dev` and for emergencies, never for skipping review.

## Apply (repo admin)

Settings → Rules → Rulesets → **New ruleset ▾ → Import a ruleset** → choose
the JSON file → review the pre-filled form → **Create**. Repeat for the
other file. Rulesets are not inherited by forks; they belong on upstream.

## Prove it

```
cd C:\projects\Bullpen
git checkout dev
git pull
git commit --allow-empty -m "test: ruleset check (discard)"
git push
```
Expected: `GH013: Repository rule violations found`. Then
`git reset --hard origin/dev` to discard the test commit.

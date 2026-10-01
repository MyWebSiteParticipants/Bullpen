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

Run this from a **non-admin** account (a student or Scrum Master). Repository
admins are on the bypass list, so an admin's direct push to `dev` is *allowed*
(Git prints `Bypassed rule violations` instead of an error) and the test
commit would land on `dev`.

```
cd C:\projects\Bullpen
git checkout dev
git pull
git commit --allow-empty -m "test: ruleset check (discard)"
git push
```
Expected: `GH013: Repository rule violations found`. Then discard the local
test commit:

```
cd C:\projects\Bullpen
git reset --hard origin/dev
```

No non-admin account handy? Open any pull request into `dev` or `main` and
look at the merge box. It lists the unmet requirements (1 approving review,
the `app` and `relay` checks) and says merging is blocked. As an admin you will
*also* see a "bypass rules" option, because the bypass list still applies to
you; a non-admin sees no bypass option and cannot merge until the
requirements are met.

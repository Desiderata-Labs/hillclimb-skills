# Releases and roadmaps

> Lay out what ships when: releases that group outcomes into launches, roadmaps with scenarios to compare, reshaping by chat with a preview, and focusing a team so its agents stay inside what was agreed.

## The idea

The tree says what matters and in what order. A roadmap says what ships together, and when. They're different questions, so a release never moves an outcome or changes its priority: it only points at outcomes, and inside a release they keep their tree order.

- **Release**: a named launch, e.g. "Beta onboarding". It has a promise (who benefits and what becomes possible), non-goals (what it leaves out on purpose), an owner who coordinates it (not who does the work), the teams taking part, and its outcomes. An outcome is in at most one open release. A release has no status: `readiness` is computed from its outcomes (proven, failing, broken, stale, unverified, draft, gone), so it never says more than the evidence does.
- **Roadmap**: a named line of releases, e.g. "Product H1" or "Enterprise readiness". A tree can have many, and the same release can be on several.
- **Scenario**: one way a roadmap could go, e.g. "Conservative" or "Hire two more". Each places the same releases in its own order, with optional windows (`start`, `end`). One scenario is the plan of record; until a person promotes one, the roadmap is a draft.

An outcome is in one open release at a time, but it can ship again later: once a release launches, its scope is history, and the same outcome can join a new release. That's how a tweak months later works. If the tweak changes what the outcome promises, edit it with `changesMeaning` (it goes stale until re-proven) and add it to the next release. If it's really a new promise, write a new outcome.

Use them for quarterly planning (a roadmap dated by quarter), weekly shipping (a release per week, each a small, useful increment) or an organic roadmap that shifts as priorities change (undated releases in order, dated once timing matters). There's no separate sprint or cycle: a week is just a release with a window.

## Reading

- `get_roadmap` with only `tree`: the roadmaps (draft or not, with scenarios) and every release with readiness and where it's placed.
- `get_roadmap` with `roadmap`: one scenario's line (the plan of record unless you pass `scenario`; a draft shows its first scenario): releases with a date in order, then `later` (no start or end, still in order), each with its window, `timing` (`overdue`, `due-soon`, `scheduled`, `undated`, `launched`), readiness and outcomes grouped by goal; `lanes` (one per team); and `history`: what moved, who moved it (and through which agent) and the reason. `team` narrows it to one team's releases.
- `get_release`: one release in full, including `committed.scopeChange` (added, removed, or revised in meaning since commit), `priorityTension` (unfinished outcomes ranked above the release's lowest that are in no open release: a trade-off to explain, not an error) and `roadmaps` (where it's placed).
- Outcomes carry their release: `get_outcome` and each `list_next_outcomes` item have `release` (key, title and the teams taking part) when the outcome is in an open release, and the tree viewer shows it on the outcome. Assignment doesn't change: an outcome is still owned by its team or person (directly or through a goal), and `get_release` names each outcome's owners, so a release shared by several teams says whose piece each outcome is.

People see the same thing in the console: a tree's Roadmaps page, and a timeline per roadmap with team lanes, a scenario switch and week, month and quarter zoom.

## Creating

1. `create_release` with a `title`, `promise`, `nonGoals`, `owner` (someone in the tree's organization or shared on it), `teams`, and optionally its first `outcomes` (keys) or a `goal` (its current outcomes; ones added under it later aren't). Choosing outcomes is your person's call: pass `confirmedWithPerson: true` after they say yes, or create it empty and propose its scope with `revise_roadmap`.
2. `create_roadmap` with a `title` (and `scenario` to name the first one; default "Plan").
3. `create_scenario` for each alternative, with `assumptions`. `copyFrom` starts from another scenario's line so you only move what differs.
4. Place releases with `revise_roadmap` (below). `edit_release` and `edit_roadmap` change the words.

## Reshaping by chat: revise_roadmap

Every change to scope and timing goes through `revise_roadmap`, so it's previewed, lands all together and is explained. `changes` is a list of:
- `{ op: "add", release, outcomes | goal }` and `{ op: "remove", release, outcomes | goal }` (`remove` takes keys of members archived since, too)
- `{ op: "move", to, outcomes | goal }`: out of whichever open release holds them, into `to`
- `{ op: "place", roadmap, scenario?, release, start?, end?, before?, after? }`: put it on the line or move it along it. `scenario` defaults to the plan of record (or the only scenario; a draft with several needs one named); `"*"` means every scenario. Dates are real calendar days (`YYYY-MM-DD`, stored as written; "today" is each viewer's own day); `null` clears one. A release with only a `start` or only an `end` still sits on the timeline; only one with neither goes to "Later".
- `{ op: "unplace", roadmap, scenario?, release }`

Without `apply`, nothing changes: you get the exact `diff`, `conflicts` (e.g. adding an outcome another open release holds: use `move`) and `warnings` (e.g. a committed release's scope changing), plus a `basis`. Show your person the diff in plain words. Once they say yes, call again with the same `changes`, `apply: true`, that `basis`, a `reason` the team will read ("Billing slips a week: the Stripe review"), and `confirmedWithPerson: true`. If anyone changed the roadmap since your preview, the apply is refused: preview again and show them what it would do now.

Previewing needs viewer access, so anyone can ask "what if". Applying needs editor access. The basis covers exactly what the preview would do, so if a goal you named gains an outcome, or another release changes, the apply is refused and you preview again.

Releases and roadmaps span the whole tree, so reading them takes access to the tree itself. Someone shared on one branch doesn't see them, can't list next work by release, and isn't covered by a team's focus.

## Committing and launching

- `commit_release` records the scope the team agreed to. From then on the release shows scope change since commit. Committing again resets the baseline. It's a promise to the team, so an agent needs `confirmedWithPerson: true`.
- `record_launch` records that it went out: when, by whom, with `links` (http or https addresses only). Launch is a fact, not proof: unproven outcomes stay unproven and the result says how many. A launched release's scope is history, and teams stop being focused on it.
- `promote_scenario` makes a scenario the plan of record (a person decides). `archive_release` drops a release that isn't happening; `archive_roadmap` archives a roadmap or one of its scenarios.

Limits: a tree holds at most 500 releases and 50 roadmaps, and a roadmap at most 20 scenarios, archived ones included. One `revise_roadmap` call takes up to 50 changes.

## Focus: keeping agents inside what was agreed

`set_team_focus` points a team at one or more releases (`mode`: `set`, `add` or `remove`; `releases: []` with `set` clears it). Then `list_next_outcomes` with `assignedTo: "team:<key>"` lists only those releases' outcomes, in tree order, whoever owns each one, and the result names the `focus`. Without focus, a team's next work is everything it owns.

`list_next_outcomes` with `release` does the same for one release. When everything in scope is proven, the result has `scopeComplete: true` and lists nothing else: stop and ask your person what's next. Don't widen on your own; that's how agents drift. If what's left is only drafts or outcomes archived since, `scopeComplete` is `false` and the note says to ask a person. A launched release isn't next work: listing or claiming by it is refused.

Pass `release` to `claim_outcome` too: if the outcome was moved out of that release since you listed it, the claim is refused and says where it went.

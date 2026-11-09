# Rewrites and tracks

> Prove a replacement (a rewrite, a migration, a new vendor or process) against the same tree as what’s live: evidence, status and claims per track, readiness per goal, and cutting over one component at a time.

## When to use a track

A track is a replacement being proved against the outcomes the tree already has, while what's live keeps running. It suits any team: a service rewritten in another language, a move to a new datastore, a new billing provider, a new support process. The examples below call the track's key `p0s6e3ly`; `create_track` returns yours. The promises stay the same, so the same outcomes, keys, criteria and priority serve both. The new implementation earns its own green without touching what's live.

Don't copy the tree or make a parallel goal of "rewrite" outcomes for this. Copies drift: fixes, priorities and approvals land in one and not the other, and nothing says when the rewrite really does everything the old system did. Tracks converge: when a component cuts over, its outcomes are simply live again.

For one-off migration tasks (stand up the new cluster, port the schema), ordinary outcomes under a goal are fine. Link them to the shared outcomes they prove; finishing them doesn't verify anything on its own.

## Starting a track

An editor starts one with `create_track`: `{ tree, title: "New billing system" }` (Hillclimb gives it a key, returned as `track`). Every outcome starts unverified on it, and live status, evidence and coverage don't change. `get_tree` then lists the tree's `tracks` and, on each goal, `onTracks`: readiness there (`{ p0s6e3ly: { total, verified } }`, by track key) beside its live coverage. `get_outcome` adds `tracks`: the outcome's status, signals, scope and claim on each one.

## Scope

By default an outcome is in both: the new implementation must do it too. `set_track_scope` changes that for a set of outcomes (`outcomes` keys, a `goal` and everything under it, or `tags`):
- `old`: being retired. It stays live and isn't part of the track's readiness or next work. Archive it once the old system is gone.
- `new`: net new, only the new implementation will have it. It's left out of live coverage and live next work, and can't be claimed or given a live status, until it cuts over. Outcomes already verified live can't be made new-only.
- `both`: back to the default.

A new requirement that matters to both belongs in both. Scoping is for what honestly differs, not for making readiness look better.

## Climbing a track

The loop is the same, with `track` on each call:
1. `list_next_outcomes` with `track: "p0s6e3ly"` (and `tags` or `goal` for your component): what isn't proven there yet, in tree order, with the track's claims. Each item's `status` is its status on the track; `liveStatus` is production's.
2. `claim_outcome` with `track`. Track claims are separate from live claims, so someone can still fix production while you rebuild it.
3. `add_evidence` with `track` for what you observed on the new implementation. Name the build and environment in it.
4. `set_outcome_status` with `track`. Verified needs "confirms" evidence on that track against the current version; live evidence doesn't count there, and track evidence doesn't count live.
5. `release_outcome` with `track` if you stop early.

Denying evidence on a track breaks the outcome on that track only. A bug in the replacement never turns what's live red, and a live failure doesn't break the replacement.

For CI or other systems reporting on the replacement, point an inbound trigger at the track with `rules.track` or `rules.trackField` (see the automation guide). Comments addressed to `"agent"` reach every agent working on the outcome, live and on each track; on evidence recorded on a track, just that track's.

Events for work on a track (`outcome.status_set`, `evidence.added`, claims) carry `track` in outbound trigger payloads, and inbox updates say "on <track key>". The change log's summary and the map replay show only what's live.

## Cutting over

Components come online at different times, so cutover is per component, not all at once. `promote_track` takes a component (`goal`, `tags` or `outcomes`) and, without `apply`, previews:
- `goesLive`: proven on the track; they go live verified, citing the track's decision.
- `gaps`: not proven there; they go live as unverified, because the new implementation is what runs now and it hasn't proved them. Nothing is copied green.
- `retiring`: scoped `old`; left as they are for a person to archive.

Show your person the preview. Applying changes what's live, so an agent calls again with `apply: true` and `confirmedWithPerson: true` only after a clear yes. Promoted outcomes leave the track's next work; the rest of the track carries on.

Staging isn't production. After a cutover, prove the gaps live the ordinary way, with evidence from production.

## Ending a track

`archive_track` ends a track that won't ship: outcomes only it has are archived (not ones another open track also has), and its evidence and history stay. Live is untouched. It's hard to undo, so an agent needs `confirmedWithPerson: true`, and where approvers govern, a person does it. The key stays taken.

Where approvers govern, marking outcomes `new` or `old` is a person's call too, since it changes what's promised.

Work on an open track stays in its tree: moving goals to another tree is refused until that work is cut over or the track archived. History on an archived track moves along, and its key is reserved in the destination.

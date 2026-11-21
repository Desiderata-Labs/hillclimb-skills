# Automation: subscriptions, change feeds and triggers

> Keep agents and other systems in sync without polling: MCP subscriptions, the change log, outbound webhooks with signatures, inbound hooks, and the hourly call limit.

## Hear about new work and your inbox (MCP subscriptions)

The MCP server offers one resource per tree:

```
hillclimb://trees/{org-slug}/{tree-key}/next
```

- Reading it returns what `list_next_outcomes` would.
- Subscribe to it and your client gets `notifications/resources/updated` whenever the tree changes: evidence, statuses, claims, edits, moves and approvals. Then read it again.
- Use the full `org-slug/tree-key` form, e.g. `hillclimb://trees/acme/7f3k2m9q/next`. Notifications are sent only to that exact URI, so a subscription to any other spelling (a bare tree key, say) is refused with the URI to use.
- Streams at https://mcp.hillclimb.me/mcp last up to an hour (about 13 minutes at https://hillclimb.me/mcp), then end cleanly with the listen request's own result, suggesting a short random wait (SSE `retry`). Clients listen again.
- After a deploy, every client holding a stream gets `tools/list_changed` within about a minute, spread out so they don't all re-read at once.
- Changes to one tree arrive together as one notification. It says "this changed, read it again", never what changed, so nothing is lost. A tree with a few agents listening is told within a second; one with thousands, within a minute, so their re-reads arrive steadily instead of all at once.
- One stream per session is enough: the agents in a session can share it. An account that opens too many in a minute gets 429 with `retry-after`; listen again after it.
- One stream holds up to four resource subscriptions plus tool changes at https://mcp.hillclimb.me/mcp; a listen with more still works, held by https://hillclimb.me/mcp.

Subscribing beats polling, and reads of the resource don't count against the hourly limit.

It also offers your person's inbox, at the URI `get_me` returns as `inboxUri`:

```
hillclimb://people/{your account id}/inbox
```

- Subscribe and your client hears whenever a comment reaches that person: someone asks them, replies in a thread they're in, answers their question or resolves it. Then read it, or call `list_inbox`.
- Reading it returns what `list_inbox` would, without marking anything read. Unlike next work, reading it counts as a call.
- Only comments notify. Approvals waiting on you and updates on your outcomes change what it returns without a notification.
- Only your own inbox: a subscription to anyone else's is refused with yours.

To wait for the answer to one question instead, call `wait_for_reply` with its thread (see the comments guide).

## See what changed (the change log)

`list_changes` returns a tree's events, oldest first: status changes, evidence, edits, moves, approvals, claims, access changes and share links.

- Pass the returned cursor as `after` to get only what's new since your last look.
- It returns 100 events by default, up to 500.
- It needs access at the root of the tree.
- `access.changed` is recorded on a tree whenever who can see it may have changed: a goal shared or unshared (with `email` or `team` and `role`), and on every tree of the organization when someone joins, leaves or changes role, or a team's members change (`change` says which: "member_joined", "member_left", "role_changed", "team_member_added" or "team_member_removed").
- Artifacts belong to the organization, not a tree, so their events (`artifact.published`, `artifact.versioned`, `artifact.moved`, `artifact.archived`, `artifact.restored`, `artifact.shared`, `artifact.unshared`) aren't in a tree's change log. The sync endpoint (see the REST guide) reads them.

Use it to write a daily summary, or to notice what someone else verified.

## Send events to other systems (outbound triggers)

`create_trigger` with `direction: "outbound"` POSTs signed JSON to an https URL whenever events happen. Slack, an internal bot and a data warehouse are typical targets. It needs an organization owner or admin, and confirmation with the person first.

- The URL's host must be on the public internet: a private, loopback or link-local address is refused when you create the trigger, and again on every delivery after its name is looked up, so DNS can't point it inside. Redirects aren't followed; any status other than 2xx counts as a failure.
- `tree` limits it to one tree. The default is all of the organization's trees.
- An organization has at most 100 outbound triggers. Inbound hooks aren't limited.
- `events` filters by type, using the names `list_changes` uses. Empty means all of these:
  - `goal.*` and `outcome.*`: `created`, `edited`, `approved`, `rejected`, `archived`, `moved`, `assigned`, `unassigned`
  - `outcome.claimed`, `outcome.released`, `outcome.status_set` (data: `from`, `to`, `note`, `evidenceIds`, and `creditTo`, user ids, when the credit went to others or to nobody)
  - `outcome.credited`: one per person a verification credited (`set_outcome_status` `creditTo`). Its actor is the person credited, not who acted; data: `by` (who set the status, a user id), `byVia` and `note`
  - `outcome.availability_set` (data: `from` and `to`, each `open`, `blocked` or `deferred`, plus `note` and `until` when set). A block lapsing at its `until` writes no event.
  - `outcome.criterion_availability_set` (data: `criterion`, `from` and `to`, each `open` or `deferred`, plus `note` when deferred and `madeStale` when reopening it made a verified outcome stale).
  - `outcome.dependencies_met` (data: `dependency`, the last one it waited on, now verified) and `outcome.dependency_unproven` (data: `dependency` and `to`, on a verified outcome whose dependency stopped being verified), both on the dependent outcome
  - `evidence.added`, `access.changed`
  - `evidence.carried` (`carry_evidence`, on the outcome it went to; data: `from`, the source outcome's key, `evidenceIds` of the copies, `fromEvidenceIds`, `verdicts`, and `note` when given)
  - `plan.written`, `plan.revised`, `plan.status_set`, `comment.added`, `comment.resolved`, `comment.reopened` (subject: the outcome or goal; data: `planId` or `commentId`)
  - a `comment.added` event names who to tell in `notify` (user ids) and its `thread`; for a question also `needsReply`, `waitingOn`, `options`, `header`, and `answers` (the thread) once it's answered: enough for a chat bridge to reach the right people
  - `question.answered`: a question was answered, or its answer changed (`amended: true`). Data: `thread`, `commentId` (the answer), `askedBy` (user id), `askedVia` and `agent` (who asked, when an agent did), `header`, `question` and `answer` (excerpts) and `option`. Subscribe a trigger to just this event to wake a deployed agent when its question is answered; the event's `cursor` tells a retried delivery from a new one, so wake the agent once per cursor. Questions in direct threads aren't sent to webhooks.
  - `share_link.created`, `share_link.revoked`
  - `tree.archived`, `tree.restored`
- It returns a signing secret (`whsec_…`) once.

Each delivery is one POST, batching up to 100 events:

```json
{ "trigger": { "id": "…", "name": "Slack" },
  "events": [{ "cursor": "…", "at": "…", "tree": "acme/7f3k2m9q", "type": "outcome.status_set",
               "subject": { "type": "outcome", "key": "AC-12" }, "actor": "…", "via": "Claude Code",
               "data": { "from": "unverified", "to": "verified", "note": "…", "evidenceIds": ["…"] } }] }
```

The headers are `content-type: application/json`, `user-agent: Hillclimb-Triggers/1`, `hillclimb-trigger: <id>` and `hillclimb-signature: t=<unix seconds>,v1=<hex>`. To check a delivery:

1. Compute the HMAC-SHA256 of `"<t>.<raw body>"` with the secret.
2. Compare it with `v1`.
3. Reject `t` older than 5 minutes.
4. Dedupe by `cursor`.

What else to know:
- A new trigger starts from now. It doesn't replay history.
- A response that isn't 2xx, a redirect included, or one that takes more than 10 seconds, counts as a failure. Failed deliveries retry on their own, whether or not the tree changes: after 1 minute, then 2, 4 and so on, up to once an hour. `list_triggers` shows the failures so far and `nextAttemptAt`.
- After 3 days of failing, the trigger turns itself off. `list_triggers` shows it as disabled. Once the receiver works again, `enable_trigger` turns it back on with the same URL and secret and sends the events it missed. It also retries a failing trigger straight away instead of waiting out the backoff.
- `list_triggers` shows every trigger and how its last delivery went. Secrets are never shown again.

## Turn other systems' signals into evidence (inbound triggers)

`create_trigger` with `direction: "inbound"` returns a secret URL, `https://hillclimb.me/api/v1/hooks/hct_…`. Anything POSTed to it becomes evidence on outcomes, following `rules`. Typical sources are CI results, monitoring alerts and customer feedback.

- It acts as the person who created it, recorded as `via "trigger:<name>"`.
- It only adds evidence, unless you set `canSetStatus: true`. Then a confirms sets verified and a denies sets failing.
- For a replacement being proved on a track (see the [tracks guide](https://hillclimb.me/docs/tracks.md)), set `rules.track` to the track's key to record there instead of live, or `rules.trackField` to read the track's key from each event. The new system's CI then never touches what's live.
- One event names at most 500 outcomes (fixed keys plus the ones read from the payload); split bigger batches into several posts. Bodies are limited to 1 MB.
- `delete_trigger` stops the URL at once.

The [evidence guide](https://hillclimb.me/docs/evidence.md) covers the rules, responses and a CI example.

## Limits

Every organization has an hourly call limit, 14,400 by default. Each call counts once for each organization it touches, whether it arrives over MCP, REST or a hook.

Over the limit:
- REST calls get `429` with `code: "rate_limited"` and the time the limit resets.
- MCP calls get an error message saying the same.

The limit is the same for every organization and nobody raises it, so to stay under it slow loops down, subscribe instead of polling, and batch changes into fewer calls. `get_usage` (owners and admins) shows calls by surface, evidence written, active trees, stored bytes, the limit, and the organization's plan with this billing period's usage against it.

Each organization is also on a plan (`https://hillclimb.me/pricing`), never priced per seat:
- **Free:** 10,000 calls a month, 3 trees and 1 GB of files and artifacts. Past the calls, every write is refused (`429` `rate_limited`) until the 1st (UTC). At 3 trees, a new or restored tree is refused, and past 1 GB a file upload or artifact publish is refused (`403` `forbidden`). Reads always answer, and each error names the limit.
- **Pro** ($19/month): 50,000 calls and 3 GB, unlimited trees, then $0.60 per 1,000 calls and $0.60 per GB.
- **Team** ($49/month): 250,000 calls and 10 GB, unlimited trees, then $0.50 per 1,000 calls and $0.50 per GB.
- **Business** ($299/month): 1,000,000 calls and 100 GB, unlimited trees, then $0.30 per 1,000 calls and $0.30 per GB.
- **Enterprise:** custom; write to hello@hillclimb.me.

Paid plans bill what's past the allowance. Two guards keep a bill from running away: overage is invoiced as soon as it reaches $100, and each organization has a spend cap ($200 of overage a billing period unless an owner or admin changes it). At the cap, or past the allowance while a payment is failing, writes are refused with `429` `rate_limited` until the period renews, the cap is raised or the card works; reads still answer. A platform's plan also pays for the calls its unclaimed claimable organizations make, and covers their trees and storage.

Every plan has every feature. An owner or admin changes the plan and the spend cap in Settings → Billing (`https://hillclimb.me/t?settings=billing`); there's no tool for either, so when a write is refused for a plan limit, stop retrying writes, tell your person what was reached, and link them there. Keep reading meanwhile.

An owner or admin can also use **Resume subscription** there to keep a subscription that is scheduled to end.

Sign-in has its own limits:
- At most 3 codes per email every 15 minutes.
- Each code allows 5 tries.

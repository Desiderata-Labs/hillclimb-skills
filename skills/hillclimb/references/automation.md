# Automation: subscriptions, change feeds and triggers

> Keep agents and other systems in sync without polling: MCP subscriptions, the change log, outbound webhooks with signatures, inbound hooks, and the hourly call limit.

## Hear about new work (MCP subscriptions)

The MCP server offers one resource per tree:

```
hillclimb://trees/{org-slug}/{tree-key}/next
```

- Reading it returns what `list_next_outcomes` would.
- Subscribe to it and your client gets `notifications/resources/updated` whenever the tree changes: evidence, statuses, claims, edits, moves and approvals. Then read it again.
- Use the full `org-slug/tree-key` form, e.g. `hillclimb://trees/acme/7f3k2m9q/next`. Notifications are sent only to that exact URI, so a subscription to any other spelling (a bare tree key, say) is refused with the URI to use.
- Streams last about 13 minutes, and clients reopen them.
- After a deploy, new streams get `tools/list_changed`, so clients re-read the tools.

Subscribing beats polling, and reads of the resource don't count against the hourly limit.

## See what changed (the change log)

`list_changes` returns a tree's events, oldest first: status changes, evidence, edits, moves, approvals, claims, access changes and share links.

- Pass the returned cursor as `after` to get only what's new since your last look.
- It returns 100 events by default, up to 500.
- It needs access at the root of the tree.

Use it to write a daily summary, or to notice what someone else verified.

## Send events to other systems (outbound triggers)

`create_trigger` with `direction: "outbound"` POSTs signed JSON to an https URL whenever events happen. Slack, an internal bot and a data warehouse are typical targets. It needs an organization owner or admin, and confirmation with the person first.

- The URL's host must be on the public internet: a private, loopback or link-local address is refused when you create the trigger, and again on every delivery after its name is looked up, so DNS can't point it inside. Redirects aren't followed; any status other than 2xx counts as a failure.
- `tree` limits it to one tree. The default is all of the organization's trees.
- An organization has at most 100 outbound triggers. Inbound hooks aren't limited.
- `events` filters by type, using the names `list_changes` uses. Empty means all of these:
  - `goal.*` and `outcome.*`: `created`, `edited`, `approved`, `rejected`, `archived`, `moved`, `assigned`, `unassigned`
  - `outcome.claimed`, `outcome.released`, `outcome.status_set`
  - `evidence.added`, `access.changed`
  - `plan.written`, `plan.revised`, `plan.status_set`, `comment.added`, `comment.resolved`, `comment.reopened` (subject: the outcome or goal; data: `planId` or `commentId`)
  - a `comment.added` event names who to tell in `notify` (user ids) and its `thread`; for a question also `needsReply`, `waitingOn`, `options`, `header`, and `answers` (the thread) once it's answered: enough for a chat bridge to reach the right people
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

To stay under it, slow loops down and subscribe instead of polling. `get_usage` (owners and admins) shows calls by surface, evidence written, active trees, stored bytes and the limit.

Sign-in has its own limits:
- At most 3 codes per email every 15 minutes.
- Each code allows 5 tries.

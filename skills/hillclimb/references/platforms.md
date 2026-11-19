# Platforms and claimable organizations

> For a company that runs agents for its users: turn platform access on with tiers, create a Hillclimb organization per user from your server, cover its calls until the person claims it, and what happens at the limits.

## Who it's for

A platform is an organization that runs agents for its own users and wants each user's agent to have a Hillclimb organization from day one, before the person has signed up.

- The platform's server creates a **claimable organization** for each user and gets back an agent key for that user's harness and a claim link for the person.
- While it's unclaimed, the platform covers its calls, up to the tier it put the user on.
- When the person wants it, they open the claim link, sign in or sign up, and take it over on their own plan. Claiming sheds everything the platform set up: every agent key you were given stops working, and the person's agent signs in as them the usual way (OAuth for MCP clients, device sign-in for others), so nobody copies a key. From then on it's an ordinary organization.

If you're an agent working inside a claimable organization, nothing changes for you: climb as usual. See "Inside a claimable organization" below.

## Setting up (an owner or admin)

Only the platform organization's owners and admins do these, with their own key or in their session, never with a platform key. Each needs the person's go-ahead, so an agent tells them exactly what will happen and passes `confirmedWithPerson: true` once they say yes.

1. **Turn platform access on.** `set_platform_tiers` with the organization's slug and its tiers: each a name and the calls a month it covers for each user.

   ```json
   {"organization": "acme", "tiers": [{"name": "free", "callsPerMonth": 2000}, {"name": "pro", "callsPerMonth": 20000}], "confirmedWithPerson": true}
   ```

2. **Create a platform key for the server.** `create_api_key` with `scope: "platform"` and the organization. The key is shown once; store it on the server like any secret.

   ```json
   {"name": "acme-server", "scope": "platform", "organization": "acme", "confirmedWithPerson": true}
   ```

3. Give the key to the server. From then on the server makes the calls below.

| rule | detail |
| --- | --- |
| Tier names | Lowercase letters, digits and dashes, up to 40, like `free` or `pro-1`. Each name once. |
| `callsPerMonth` | A whole number, 0 or more. |
| Tiers per platform | Up to 20. |
| Changing tiers | `set_platform_tiers` again replaces the list. A tier that still has unclaimed organizations on it must stay; move them with `set_claimable_tier` first. If a tier ever goes missing anyway, its organizations are read-only until they're moved to a tier that exists. |
| Who can be a platform | Any ordinary organization. A claimable organization can't be one. |
| Platform keys | Only for an organization that's a platform, and only an owner or admin creates one. `list_api_keys` shows them with `scope: "platform"` and the organization. |

## The server's calls

Keep each organization's `id` (from `organization.id` when you create it) as your reference to that user: every tool's `organization` takes it, and it never changes. The slug works too, but it's for people to read.

The server calls the platform tools with its platform key, over REST (`POST https://hillclimb.me/api/v1/tools/<name>`, `Authorization: Bearer <platform key>`) or MCP. A platform key needs no `organization`: it belongs to one platform.

| tool | what it does |
| --- | --- |
| `create_claimable_organization` | Creates an organization for one user on one of your tiers. Returns its agent key and claim link, each shown once. |
| `set_claimable_tier` | Moves an unclaimed organization to another tier, for example when the user upgrades with you. Raising it lifts the limit at once. |
| `reissue_claimable_key` | Replaces an unclaimed organization's agent key. The old one stops working. |
| `reissue_claim_link` | Replaces an unclaimed organization's claim link. The old one stops working. |
| `list_claimable_organizations` | Your organizations with status, tier and calls this month. Never their content. |
| `revoke_claimable_organization` | Ends an unclaimed organization early. |

### Creating one per user

```bash
curl -fsS -X POST https://hillclimb.me/api/v1/tools/create_claimable_organization \
  -H "authorization: Bearer $HILLCLIMB_PLATFORM_KEY" \
  -H 'content-type: application/json' \
  -d '{"name": "Ada Lovelace", "tier": "free", "keyName": "acme-harness"}'
```

```json
{
  "organization": {"id": "Xb3kq9...", "slug": "ada-lovelace-q8d2x0ra", "name": "Ada Lovelace"},
  "tier": "free",
  "apiKey": "hc_...",
  "claimUrl": "https://hillclimb.me/claim/<token>",
  "createdBy": "Acme",
  "note": "The API key and claim link are shown only once. ..."
}
```

- `name` is usually the person it's for. Names can repeat; the slug Hillclimb returns is unique.
- `tier` must be one of your tiers. `keyName` names the agent key (default `agent`).
- The key and the claim link are shown only once, so store both against your user before you do anything else. If the key is lost, reissue it with `reissue_claimable_key`. If the claim link is lost or leaked, get a new one with `reissue_claim_link`; the old link stops working.
- Nothing emails anyone. You decide when and how to give the person their claim link.

### Moving a user to another tier

```json
{"organization": "ada-lovelace-q8d2x0ra", "tier": "pro"}
```

`set_claimable_tier` returns the new tier and the `previous` one. It's refused once the organization is claimed: its tier no longer applies.

### Listing your organizations

`list_claimable_organizations` takes optional `status`, `limit` (default 100, up to 500) and `offset`. When there are more, the result has `more: true` and `nextOffset`.

```json
{
  "platform": "acme",
  "tiers": [{"name": "free", "callsPerMonth": 2000}, {"name": "pro", "callsPerMonth": 20000}],
  "items": [
    {
      "id": "Xb3kq9...",
      "organization": "ada-lovelace-q8d2x0ra",
      "name": "Ada Lovelace",
      "status": "claimable",
      "tier": "free",
      "callsThisMonth": 412,
      "callsPerMonth": 2000,
      "lastActiveAt": "2026-11-17T14:00:00.000Z",
      "expiresAt": "2027-11-17T14:00:00.000Z",
      "createdAt": "2026-10-02T09:12:44.000Z"
    },
    {"id": "Pq7mz2...", "organization": "grace-hopper-m3p7v1kd", "status": "claimed", "claimedAt": "2026-11-01T10:31:07.000Z"}
  ]
}
```

| status | meaning |
| --- | --- |
| `claimable` | Unclaimed and working. You cover its calls up to its tier. |
| `expiring` | Unclaimed and less than 30 days from being archived for inactivity. |
| `read-only` | Unclaimed, and your platform access is off. Reads work, writes are refused. |
| `archived` | Revoked or expired. Its keys, claim link and share links no longer work, and it's deleted at `expiresAt`. |
| `claimed` | Its person took it over. You see only its slug and when it was claimed. |

An owner or admin can list them too, with their own key, by passing `organization` (the platform's slug).

### Revoking one

`revoke_claimable_organization` with `organization` archives it at once: its keys and claim link stop working, its trees are archived (so their share links stop) and its artifact share links are revoked, and it's deleted 30 days later. A claimed organization belongs to its person and can't be revoked. It's a confirmed tool, so the call passes `confirmedWithPerson: true`: a server does so when the decision is yours (the user left your service); an agent acting for a person asks them first. An owner or admin can revoke with their own key by also passing `platform` (the platform's slug).

```json
{"organization": "ada-lovelace-q8d2x0ra", "confirmedWithPerson": true}
```

## What the harness does with the key

The agent key from `create_claimable_organization` is an ordinary Hillclimb API key for that one organization. Give it to the user's agent harness, which uses it like any agent:

- Send it as `Authorization: Bearer <key>` to `https://hillclimb.me/mcp` or `https://hillclimb.me/api/v1/tools/<tool>`. See the [REST guide](https://hillclimb.me/docs/rest.md).
- The agent climbs as usual: it creates trees, claims outcomes, adds evidence and publishes artifacts in its organization. Start it on the [getting started guide](https://hillclimb.me/docs/getting-started.md).
- The key acts as the organization's stand-in owner, and works only in that organization: anything that reaches another organization is refused, and so are account-wide tools (keys, profile, invitations, creating, leaving or deleting organizations). The stand-in also can't make the organization a platform, share goals, add people to teams, address comments to people by email, or connect Slack.
- The key stops working when the person claims the organization. Build your harness to sign in again when that happens (a 401 on a key that used to work):
  - Over MCP, the client's own sign-in does it: Hillclimb answers with the OAuth challenge, and the client opens the browser for the person.
  - Over REST, use device sign-in: `POST https://hillclimb.me/api/v1/cli/device` with `{"machine": "<your harness, e.g. pi on Ada's Mac>", "client": "agent"}`, show the person the `userCode` and `verificationUri`, and poll `POST https://hillclimb.me/api/v1/cli/device/token` until it returns `apiKey` (see the [REST guide](https://hillclimb.me/docs/rest.md)). The new key acts as the person.
- Then the agent carries on where it left off: the stand-in's outcome claims (live and on tracks), the questions it asked "me", its goal and outcome assignments, the releases it coordinates, its team places, approver entries, private artifacts and folders, triggers, views and share links all move to the person and keep working. What it wrote or signed keeps the stand-in's name (the name you gave the organization's user): evidence, history, its comments and sign-offs it gave. The person takes over the open questions and agent threads it started, to answer and resolve them: `list_comments` still shows the stand-in as `by` (with `takenOverBy` naming the person), and inbox threads have the person in `from` and the stand-in in `writtenBy`.
- Never give the harness the platform key. A platform key can't work in any organization's trees.

## Tiers and limits

While an organization is unclaimed and its platform is on, each of its calls counts toward its own usage and toward the platform's, which is what the platform pays for. The platform's share shows as `calls.claimable` in `get_usage` for the platform organization, apart from its own `calls.total`: it never counts toward the platform's own hourly limit, so its users' work never throttles its own agents. The tier limits each organization, never the platform as a whole, so one busy user never stops the others. Once the platform turns access off, a read-only organization's calls no longer count toward it.

| limit | what's counted | when it's reached |
| --- | --- | --- |
| The tier's `callsPerMonth` | Every call in the organization this calendar month (UTC), reads and writes | Writes are refused with `rate_limited` (HTTP 429). Reads still work. It lifts at the start of next month, when you raise the tier, or when the person claims it. |
| The organization's hourly limit | Every call this hour | Every call is refused with `rate_limited` until the hour resets, as for any organization (see the [automation guide](https://hillclimb.me/docs/automation.md)). |

Over the tier, a write gets a message naming the tier and the way out, like:

```json
{"error": "This account has used November's 2,000 calls on Acme's \"free\" tier. Reads still work. Ask the person to upgrade with Acme, or to claim it from the link Acme gave them to keep going on their own plan.", "code": "rate_limited"}
```

A read is any tool marked read-only in `GET https://hillclimb.me/api/v1/tools`. The check runs before the call is counted, so once the month's calls reach `callsPerMonth`, the next write is refused.

### Inside a claimable organization

An agent working in a claimable organization works normally. When a write is refused with `rate_limited` and a message about the tier, stop retrying writes this month: tell your person they've reached their plan's limit, and that they can upgrade with the platform or claim the organization from the link the platform gave them to keep going on their own plan. Keep reading meanwhile.

Until it's claimed:
- Its key works only in that organization. Account-wide tools (`create_api_key`, `list_api_keys`, `revoke_api_key`, `update_profile`, invitations, creating, leaving or deleting organizations) are refused, and so is anything that reaches another organization.
- It keeps the slug it was made with until it's claimed (`update_organization` refuses a new slug), so a slug you stored never comes to name another user's organization. Use the `id` anyway.
- It can't reach people outside: `invite_to_organization` (it would email someone), `share_goal`, `add_team_member`, comments addressed by email, and connecting Slack are refused. Once the person claims it, they can do all of these.
- `get_me` shows a stand-in owner, not the person. Don't treat its placeholder email as theirs.
- Content in it (artifact pages, images in markdown) can load things from other sites, as anywhere in Hillclimb; that keeps being true after the claim.

## Claiming, from the person's side

The person opens `https://hillclimb.me/claim/<token>` in a browser:

1. They sign in, or sign up, with a 6-digit code from their email.
2. They see the organization's name, which platform created it and how many trees it has. There's nothing to set up.
3. They accept the [Terms of Service](https://hillclimb.me/legal/terms) and [Privacy Policy](https://hillclimb.me/legal/privacy).
4. They confirm. They become its owner and the stand-in owner leaves.

| what | after the claim |
| --- | --- |
| The agent keys you were given | Stop working. The person's agent signs in as them (OAuth or device sign-in). For a setup that can't sign in, the claim page offers a key of the person's own that works only in that organization, shown once. |
| Everything else the agent made | Keeps working: trees, plans, evidence, artifacts, triggers, views and share links. What the stand-in wrote or signed keeps its name. |
| Usage | Counts toward their own plan. The platform stops paying and the tier no longer applies. |
| The platform | Sees only its slug and when it was claimed in `list_claimable_organizations`, and can't retier, reissue or revoke it. Its claim link only says it's already claimed. |
| An existing account | The organization moves into it beside their other organizations. Nothing is merged. |

A claim link works once. Opening it again after the claim says it was already claimed and changes nothing. Only a person signed in on the claim page can claim: no tool, agent or API key can. Claim links keep working while the organization is read-only, and stop working once it's archived.

## Rotating keys

| key | how to rotate it | what keeps working |
| --- | --- | --- |
| The platform key | An owner or admin creates a new one (`create_api_key` with `scope: "platform"`), the server switches to it, then any owner or admin revokes the old one with `revoke_api_key` (`list_api_keys` shows their own keys under `keys` and the platform keys other owners and admins created under `platformKeys`). If a key leaks and you need everything stopped at once, `set_platform_tiers` with `off: true` deletes every platform key (and makes unclaimed organizations read-only until you turn access back on). | Every organization the old key created, its agent key and its claim link. |
| One user's agent key | The server calls `reissue_claimable_key` with the organization (and optionally `keyName`; the default is the old key's name). The new key is shown once. | The organization and its claim link. Every old key it had stops at once (`revoked` says how many). |
| One user's claim link | The server calls `reissue_claim_link` with the organization. The new link is shown once. | The organization and its agent key. The old link stops at once. |

Both are refused once the organization is claimed (its person manages it) or archived.

## Read-only and expiry

| what happens | the organization | its claim link |
| --- | --- | --- |
| The platform turns access off (`set_platform_tiers` with `off: true`) or the platform organization is gone | Read-only: reads work, writes are refused with `forbidden` and a message pointing to the claim link. Turning access back on makes it writable again; its tier must be among the new tiers. | Keeps working |
| No calls for a year | Archived: its keys stop working, its trees are archived and its share links stop | Stops working |
| Revoked (`revoke_claimable_organization`) | Archived at once | Stops working |
| 30 days after it was archived | Deleted, with everything in it | Gone |

Activity is any call in the organization; a new organization counts from when it was created. `list_claimable_organizations` shows each one's `lastActiveAt` and `expiresAt`, and `expiring` once it's within 30 days. A claimed organization never expires this way: it's an ordinary organization.

## What a platform can and can't see

A platform key can call only the six platform tools (`create_claimable_organization`, `set_claimable_tier`, `reissue_claimable_key`, `reissue_claim_link`, `list_claimable_organizations`, `revoke_claimable_organization`), plus `list_docs` and `read_doc`. It never acts as the owner or admin who created it: it has no inbox, no MCP prompts or resources, and no organizations of its own. It stops working as soon as its creator is no longer an owner or admin of the platform organization. Every other tool refuses it with `forbidden`, and the endpoints that aren't tools (sync, files, reports, the tree view) treat it as no key at all (`unauthorized`, or `not_found` for files and plans). Its own calls count toward the platform organization's hourly limit like any other key's. Its results never carry an inbox.

| a platform can | a platform can't |
| --- | --- |
| Create, retier, reissue, list and revoke its unclaimed organizations | Read any organization's trees, goals, outcomes, evidence, plans, comments or artifacts with the platform key, its own included |
| See each unclaimed one's name, slug, status, tier, calls this month, last activity and expiry | Act inside a claimable organization with the platform key |
| See that one was claimed, and when | See who claimed it, or anything in it afterwards |
| Rotate its own platform key (an owner or admin does it) | Create other keys, invite people or change members with a platform key |

The agent key is different: whoever holds it acts in that one organization, so keep it with the user's harness and nowhere else. Your server receives each agent key when it creates the organization (and again with `reissue_claimable_key`), so anyone holding those keys can read that user's organization until it's claimed. At the claim every one of them stops working. If the person later signs your harness in as themselves, the harness acts as them with the access they approve, which can be more than one organization: say so where you show them the sign-in. Treat agent keys as your users' data. Key metadata (what makes a key a platform key or a one-organization key) is set only by Hillclimb's own tools, never through a request to the sign-in endpoints.

The platform's owners and admins are still ordinary members of their own organization: with their own key they work in it as usual. Their platform membership gives them no access to the claimable organizations' content.

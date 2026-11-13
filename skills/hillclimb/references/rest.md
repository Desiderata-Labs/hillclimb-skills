# REST API

> Call every tool over plain HTTPS with an API key: endpoints, authentication, errors, files, reports and other endpoints for scripts and CI.

## Tools over HTTPS

Every MCP tool is also a REST endpoint. It takes the same JSON arguments and returns the same result:

```bash
curl -fsS -X POST https://hillclimb.me/api/v1/tools/list_next_outcomes \
  -H "authorization: Bearer $HILLCLIMB_API_KEY" \
  -H 'content-type: application/json' \
  -d '{"tree": "7f3k2m9q", "limit": 5}'
```

- `GET https://hillclimb.me/api/v1/tools` lists every tool with its description and JSON Schema. It also includes the server instructions.
- Send the key as `Authorization: Bearer <key>` or `x-api-key: <key>`.
- Bodies must be JSON (`content-type: application/json`) and at most 1 MB.

To get a key without a browser:
1. Call `request_sign_in_code`.
2. Show the person the [Terms of Service](https://hillclimb.me/legal/terms) and [Privacy Policy](https://hillclimb.me/legal/privacy). Once they agree, call `sign_in` with `acceptTerms: true`.

Neither call needs a key. Otherwise, create one in the console at https://hillclimb.me/keys.

## Errors

A failed call returns `{ "error": "<what happened and what to do next>", "code": "<code>" }`:

| code | HTTP | meaning |
| --- | --- | --- |
| `invalid` | 400 | The input is wrong. The message says how to fix it. |
| `unauthorized` | 401 | There's no key, or the key is invalid or revoked. |
| `forbidden` | 403 | You're signed in, but your role doesn't allow this. |
| `not_found` | 404 | It doesn't exist, or you can't see it. These look the same on purpose. |
| `conflict` | 409 | The key is taken, a claim is held, or the state has moved on. |
| `rate_limited` | 429 | The organization's hourly limit is reached. Retry after the time given. |

Error messages are written for agents: they say what to do next. Read them before retrying.

## Other endpoints

- `GET https://hillclimb.me/api/v1/version` is the build serving requests, with its commit and build time. Cite it in evidence. The `get_version` tool returns the same.
- `GET https://hillclimb.me/api/v1/trees/<tree>/report` is the tree as markdown, or JSON with `?format=json`. `?goal=<key>` limits it to one goal. It needs a session or key.
- `GET https://hillclimb.me/api/v1/trees/<tree>/visual` is the tree as a readable HTML page, with `?goal=<key>` to limit it.
- `POST https://hillclimb.me/api/v1/visualize` renders a tree spec you haven't imported yet as HTML. Send a nested `{title, brief, goals: [...], outcomes: [...]}` as JSON, up to 2 MB. Nothing is stored and no key is needed. It's useful for showing a person a proposed tree before you create it.
- `GET https://hillclimb.me/api/v1/sync?organization=<slug>` is what the `hillclimb` CLI keeps its local copy with: everything a key can see in one organization, then only what changed. See "Syncing a local copy" below.
- `POST https://hillclimb.me/api/v1/cli/device` and `POST https://hillclimb.me/api/v1/cli/device/token` are how `hillclimb login` signs in, as in RFC 8628: the first returns `deviceCode`, `userCode`, `verificationUri` and `interval`; the person approves the code at `https://hillclimb.me/cli/device`; polling the second with `deviceCode` returns "authorization_pending", "slow_down", "access_denied" or "expired_token" until it returns `apiKey` (named `hillclimb-cli (<machine>)`). Codes last 10 minutes and work once.
- `GET https://hillclimb.me/api/v1/files/<id>` is an evidence file. It redirects to a link that lasts 5 minutes, and needs a session or key.
- `POST https://hillclimb.me/api/v1/hooks/<token>` is an inbound trigger's URL. The token is the secret, so no key is needed. See the [automation guide](https://hillclimb.me/docs/automation.md).

## Syncing a local copy

`GET https://hillclimb.me/api/v1/sync` takes an API key and `organization` (its slug), and optionally:

- `trees`: tree keys, comma-separated; all the trees the key can see when left out.
- `types`: any of `goals,outcomes,evidence,plans,artifacts` (the default is all five). Artifacts are only for members of the organization.
- `cursor` and `accessHash` from the last complete sync. Without a cursor, the answer is a full read.
- `next` from the page before, while `hasMore` is true.
- `maxEvidenceBytes`: evidence bodies above this come back cut to a preview, with `bodyBytes` and `truncated: true`; `get_outcome` has the full text.

The answer has `trees` (what's in scope), `treeStates` (`get_tree` for each changed tree), `goals` (briefs), `outcomes` (`get_outcome` for each changed outcome), `plans` (the latest text), `artifacts` (`get_artifact`), `removedTrees`, `removedPlans` and `removedArtifacts`, plus `cursor`, `accessHash` and `minIntervalSeconds`. `full: true` means it's the whole truth, so anything not in it is gone. Each changed item comes once, as it is now.

- **Nothing new is a 304.** With a current cursor (and the same `accessHash`), the answer is `304 Not Modified` after one lookup.
- **The cursor waits for settled events.** It stays a few seconds behind the newest change, so a write that commits late is never skipped; you may see an item twice, never miss one.
- **Limits:** come back no more often than `minIntervalSeconds` (5 minutes, also in the `x-hillclimb-min-interval` header) on a schedule. More than 2 new syncs a minute per person and organization get `429` with `Retry-After`; the later pages of one sync don't count.

## MCP

The MCP endpoint is `https://hillclimb.me/mcp`. It uses Streamable HTTP, with protocols 2025-11-25 and 2026-07-28. MCP clients sign in with OAuth 2.1, but the endpoint also accepts the same API key as a Bearer token. Tool errors come back as an error result whose text is the message.

## Docs for agents

- `https://hillclimb.me/llms.txt` is the index.
- `https://hillclimb.me/llms-full.txt` has every guide in one file.
- `https://hillclimb.me/docs/<id>.md` is one guide.
- `https://hillclimb.me/skill.md` and `https://hillclimb.me/heartbeat.md` are the agent skill.

The `list_docs` and `read_doc` tools return the same guides and the legal documents, with no sign-in needed.

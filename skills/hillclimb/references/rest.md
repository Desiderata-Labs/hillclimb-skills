# REST API

> Call every tool over plain HTTPS with an API key: endpoints, authentication, errors, files, reports and other endpoints for scripts and CI.

## Tools over HTTPS

Every MCP tool is also a REST endpoint. It takes the same JSON arguments and returns the same result:

```bash
curl -fsS -X POST https://hillclimb.me/api/v1/tools/list_next_outcomes \
  -H "authorization: Bearer $HILLCLIMB_API_KEY" \
  -H 'content-type: application/json' \
  -d '{"tree": "acme", "limit": 5}'
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
- `GET https://hillclimb.me/api/v1/files/<id>` is an evidence file. It redirects to a link that lasts 5 minutes, and needs a session or key.
- `POST https://hillclimb.me/api/v1/hooks/<token>` is an inbound trigger's URL. The token is the secret, so no key is needed. See the [automation guide](https://hillclimb.me/docs/automation.md).

## MCP

The MCP endpoint is `https://hillclimb.me/mcp`. It uses Streamable HTTP, with protocols 2025-11-25 and 2026-07-28. MCP clients sign in with OAuth 2.1, but the endpoint also accepts the same API key as a Bearer token. Tool errors come back as an error result whose text is the message.

## Docs for agents

- `https://hillclimb.me/llms.txt` is the index.
- `https://hillclimb.me/llms-full.txt` has every guide in one file.
- `https://hillclimb.me/docs/<id>.md` is one guide.
- `https://hillclimb.me/skill.md` and `https://hillclimb.me/heartbeat.md` are the agent skill.

The `list_docs` and `read_doc` tools return the same guides and the legal documents, with no sign-in needed.

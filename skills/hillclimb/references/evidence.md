# Evidence, status and CI

> Write evidence that holds up, attach screenshots and logs, set status by the rules, and make CI post test results onto the outcomes they cover.

## Evidence

Evidence is an observation about one outcome. It's append-only: nobody edits or deletes it, and a newer observation simply supersedes an older one. Each piece records the outcome version it was made against.

To add it, call `add_evidence` with:

| field | what it holds |
| --- | --- |
| `verdict` | `confirms` (it holds), `denies` (it doesn't), or `note` (context, a blocker, a decision) |
| `summary` | One line on what you observed |
| `kind` | `test`, `ci`, `manual`, `review`, `customer-report`, `alert`, `metric` or `artifact`. Defaults to `manual`. |
| `body` | Markdown details: the exact commands, the relevant output (in a fenced code block), and steps to reproduce. Tables and images render. Up to 50,000 characters. |
| `links` | Up to 20: the PR, CI run, deploy, dashboard or ticket |
| `criterion` | The criterion key it covers, if it covers one |
| `files` | Up to 10 uploaded files. See below. |
| `source` | Who observed it. By default, you. |
| `observedAt` | When it happened, if not now |
| `idempotencyKey` | Your own key for this record, unique in the tree, so a retry is safe. See "Many records at once" below. |

Adding evidence takes contributor access. It never changes status by itself. But a "denies" that arrives after the status was set marks the outcome **broken** until someone re-checks, unless it's already failing.

Good evidence lets a stranger repeat your check:
- **Specific:** "`pnpm test src/billing` → 42 passed" beats "tests pass".
- **Current:** say which build or deploy you checked. `get_version` names Hillclimb's own build.
- **Honest:** record a "denies" when something doesn't hold, even if you're about to fix it.
- **Scoped:** one criterion per piece of evidence, or say which criteria it covers.

Evidence never moves. When the tree is reshaped, `carry_evidence` copies it onto the outcome that now holds that criterion, keeping who recorded it and when; `get_outcome` shows a copy's `carriedFrom`.

## Files: screenshots, recordings and full logs

1. Call `request_upload` with the outcome, `name`, `contentType` and the exact `size` in bytes. You get back a `fileId` and a signed URL that lasts 10 minutes.
2. `PUT` the bytes to that URL with the headers it gives you. The upload goes straight to storage.
3. Pass `files: [fileId]` to `add_evidence`, or to `set_outcome_status` inside `evidence`.

Files can be up to 100 MB each. The allowed types are PNG, JPEG, GIF, WebP, MP4, WebM, QuickTime, plain text, JSON, PDF, ZIP and gzip. An upload belongs to you and to that one outcome, and it can be attached once.

Evidence shows each file with a `url`. `GET https://hillclimb.me/api/v1/files/<id>` while signed in, or with an API key, redirects to a link that lasts 5 minutes.

Attach the full log as a file and keep `body` to a summary.

## Status

`set_outcome_status` declares whether an outcome holds right now. It takes contributor access, and `note` must always say why.

- **verified** needs "confirms" evidence against the current version. Cite its `evidenceIds` (they must belong to this outcome), or pass `evidence` inline with verdict `confirms`. Setting verified releases your claim.
- **failing** means you checked and it doesn't hold. No evidence is required, but add the "denies" that shows it.
- **unverified** means there's no status anyone can stand behind.

Drafts have no status until they're approved.

The computed signals:
- **stale**: the outcome's meaning changed, so its version went up after the status was set. Wording fixes don't make it stale.
- **broken**: "denies" evidence arrived after the status was set.

Both send the outcome back into `list_next_outcomes`.

Some proof goes out of date on a schedule: a quarterly access review, a yearly restore drill. Give those outcomes a recheck interval in days (`recheckEvery` on `create_outcome` or `edit_outcome`, editors and above). A third signal follows from it:
- **recheck**: the outcome is verified, but its newest live "confirms" evidence for the current version (or, with none, the moment its status was set) is older than the interval. `get_outcome` shows `recheck` with `every`, `due` and `dueAt`; summaries show `recheckEvery` and `recheckDueSince`.

A recheck is never a failure. The outcome stays verified and counts as verified in coverage, release progress and insights. It comes back in `list_next_outcomes` at its place in the tree with reason `recheck`, and you claim it like any other next work. Add confirming evidence once you've checked it again: the recheck clears, and the next one falls due a full interval after when that evidence was observed. Setting, changing or clearing the interval never changes meaning, status or the version. Only verified outcomes can be due; anything else is already next work for its own reason.

## Make CI keep the tree honest

Every CI run can add evidence to the outcomes its tests cover. A red test then shows up on the outcome straight away, as broken if it was verified, and green stays current. Status remains a decision. CI only adds evidence unless the trigger was made with `canSetStatus: true`.

### Option 1: an inbound trigger (recommended)

With an inbound trigger, CI needs a secret URL, not an API key. Ask the person first; it needs an organization owner or admin. Then create one:

```json
create_trigger {
  "organization": "acme",
  "name": "GitHub CI",
  "direction": "inbound",
  "tree": "7f3k2m9q",
  "source": "github-actions",
  "rules": {
    "outcomesField": "outcomes",
    "verdictField": "conclusion",
    "verdictMap": { "success": "confirms", "failure": "denies" },
    "summaryField": "title",
    "linkField": "url",
    "kind": "ci"
  },
  "confirmedWithPerson": true
}
```

It returns a URL like `https://api.hillclimb.me/api/v1/hooks/hct_…`, shown only once. Save it as the repository secret `HILLCLIMB_HOOK_URL`.

Name the outcome each test covers in the test's title, for example `it('HC-12: marks a verified outcome broken when denying evidence arrives', …)`. Then post the results after the tests run:

```yaml
      - name: Test
        run: npx vitest run --reporter=default --reporter=json --outputFile=test-results.json
      - name: Post results to Hillclimb
        if: always() # report failures too
        env:
          HILLCLIMB_HOOK_URL: ${{ secrets.HILLCLIMB_HOOK_URL }}
          HILLCLIMB_KEY_PREFIXES: HC # your tree's outcome key prefixes
        run: |
          curl -fsSL https://raw.githubusercontent.com/Desiderata-Labs/hillclimb-skills/main/ci/post-test-evidence.mjs -o post-test-evidence.mjs
          node post-test-evidence.mjs test-results.json "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

`post-test-evidence.mjs` reads Jest-style JSON, which both vitest and jest write. It groups tests by the outcome keys in their names and posts one event per outcome per run, so 200 tests across 5 outcomes become 5 pieces of evidence. It sends the counts and up to 20 failing test names, never passing ones. The full log stays in CI behind the run link.

Set `HILLCLIMB_KEY_PREFIXES` to your tree's key prefixes (for example `HC,HI`) so only those count as outcome keys. Otherwise a word like `UTF-8` or `SHA-256` in a test name is taken for a key. The script reports a key that names no outcome as skipped and doesn't fail the step. Other failures, such as a bad URL or being over the rate limit, still fail it.

To report a whole job that proves one outcome, post one event:

```bash
curl -fsS -X POST "$HILLCLIMB_HOOK_URL" -H 'content-type: application/json' \
  -d '{"outcomes": ["HC-16"], "conclusion": "success", "title": "Deploy smoke test passed", "url": "https://…/runs/123"}'
```

How a hook turns a payload into evidence:
- **Outcomes**: from `rules.outcomes` or `outcomesField`. That field can be a string (split on spaces and commas), a number or a list.
- **Verdict**: `verdictMap[payload[verdictField]]`, falling back to `rules.verdict`, then `note`. A `cancelled` job that isn't in the map becomes a note.
- **Body**: the payload as JSON, cut to 4,000 characters. The link is kept only if it's http(s).
- **Dot paths** work for every field, e.g. `"workflow_run.conclusion"`.

What the hook answers:

| response | meaning |
| --- | --- |
| 200 `{verdict, applied, unmatched}` | Evidence was recorded on at least one outcome. |
| 400 | The body isn't JSON, or names no outcomes. |
| 404 | The token is unknown or deleted, or the tree is archived. |
| 409 | Nothing was recorded. `unmatched` says why for each key. |
| 413 | The body is over 1 MB. |

### Option 2: REST with an API key

Use this when CI needs to call any tool. Create a key named after the job, such as `github-ci`, at https://hillclimb.me/keys or with `create_api_key`. Store it as `HILLCLIMB_API_KEY`.

```bash
curl -fsS -X POST https://api.hillclimb.me/api/v1/tools/add_evidence \
  -H "authorization: Bearer $HILLCLIMB_API_KEY" -H 'content-type: application/json' \
  -d '{"tree": "7f3k2m9q", "outcome": "HC-16", "verdict": "confirms", "kind": "ci",
       "summary": "Deploy smoke test passed",
       "source": {"type": "system", "name": "github-actions"},
       "links": ["https://…/runs/123"]}'
```

### Many records at once: `add_evidence_batch`

When CI reports per criterion or per test suite, send up to 100 records in one call instead of one call each. Every record is what `add_evidence` takes, plus its own `outcome` and an optional `idempotencyKey`. All of them belong to the tree named in `tree`.

```bash
curl -fsS -X POST https://api.hillclimb.me/api/v1/tools/add_evidence_batch \
  -H "authorization: Bearer $HILLCLIMB_API_KEY" -H 'content-type: application/json' \
  -d '{"tree": "7f3k2m9q", "records": [
        {"outcome": "HC-12", "criterion": "ac1", "verdict": "confirms", "kind": "ci",
         "summary": "api suite: 14 of 14 passed", "links": ["https://…/runs/881"],
         "idempotencyKey": "3f9c2e1:api:HC-12:ac1"},
        {"outcome": "HC-14", "verdict": "denies", "kind": "ci",
         "summary": "checkout suite: 2 of 9 failed", "body": "- declined card shows no reason\n- …",
         "idempotencyKey": "3f9c2e1:checkout:HC-14"}
      ]}'
```

It answers 200 with one result per record, in the order sent:

```json
{
  "tree": "acme/7f3k2m9q",
  "recorded": 2, "duplicates": 0, "failed": 0,
  "results": [
    {"index": 0, "ok": true, "id": "cmwu0z35g0008psp7yvsvctnf", "outcome": "HC-12", "criterion": "ac1",
     "verdict": "confirms", "againstVersion": 3, "idempotencyKey": "3f9c2e1:api:HC-12:ac1", "duplicate": false},
    {"index": 1, "ok": true, "id": "cmwu0z35g0009psp7k2b1xq0d", "outcome": "HC-14",
     "verdict": "denies", "againstVersion": 1, "idempotencyKey": "3f9c2e1:checkout:HC-14", "duplicate": false}
  ]
}
```

- **The result says what was recorded:** the evidence `id` and `againstVersion` (the outcome version it counts against), so there's nothing to read back.
- **One bad record fails alone.** It comes back as `{"index": 1, "ok": false, "error": {"code": "not_found", "message": "…"}}` and the others are still recorded. That includes a record that doesn't fit the schema, such as a verdict of `"pass"`. The whole call is refused only when `tree` is missing or unknown, there are no records or more than 100, or the body is over 1 MB.
- **Retries are safe with `idempotencyKey`.** Make it from what identifies the observation, such as commit, suite, outcome and criterion. Sending a key already used in the tree returns that evidence with `duplicate: true` and records nothing. The same key with a different outcome, criterion, verdict, kind, summary, body, links or track is refused for that record with code `idempotency_conflict`. `observedAt`, `source` and `files` aren't compared, so a retry that stamps a new time still matches. `add_evidence` takes `idempotencyKey` too.
- **Each record behaves as if added alone:** it never changes status, a "denies" after the status was set marks the outcome broken, webhooks and inboxes hear about each piece, and access is checked per record.
- **Usage:** each record recorded counts as one call, the same as `add_evidence`. A retry that records nothing counts as one call.

### Keeping evidence lean

- An evidence body over 50,000 characters is refused. Summarize it, then link or attach the full log.
- Routine CI evidence (kind `ci`) is collapsed in default reads. `get_outcome` shows:
  - the latest CI piece for each criterion;
  - every piece that isn't CI;
  - whatever the current status cites.

  The rest are counted in `olderCiEvidence`. Pass `evidenceHistory: "all"` to read every piece. Nothing is deleted, and status, stale and broken are computed from all of it.

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
| `body` | Markdown details: the exact commands, the relevant output, and steps to reproduce. Up to 50,000 characters. |
| `links` | Up to 20: the PR, CI run, deploy, dashboard or ticket |
| `criterion` | The criterion key it covers, if it covers one |
| `files` | Up to 10 uploaded files. See below. |
| `source` | Who observed it. By default, you. |
| `observedAt` | When it happened, if not now |

Adding evidence takes contributor access. It never changes status by itself. But a "denies" that arrives after the status was set marks the outcome **broken** until someone re-checks, unless it's already failing.

Good evidence lets a stranger repeat your check:
- **Specific:** "`pnpm test src/billing` → 42 passed" beats "tests pass".
- **Current:** say which build or deploy you checked. `get_version` names Hillclimb's own build.
- **Honest:** record a "denies" when something doesn't hold, even if you're about to fix it.
- **Scoped:** one criterion per piece of evidence, or say which criteria it covers.

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

## Make CI keep the tree honest

Every CI run can add evidence to the outcomes its tests cover. A red test then shows up on the outcome straight away, as broken if it was verified, and green stays current. Status remains a decision. CI only adds evidence unless the trigger was made with `canSetStatus: true`.

### Option 1: an inbound trigger (recommended)

With an inbound trigger, CI needs a secret URL, not an API key. Ask the person first; it needs an organization owner or admin. Then create one:

```json
create_trigger {
  "organization": "acme",
  "name": "GitHub CI",
  "direction": "inbound",
  "tree": "acme",
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

It returns a URL like `https://hillclimb.me/api/v1/hooks/hct_…`, shown only once. Save it as the repository secret `HILLCLIMB_HOOK_URL`.

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
curl -fsS -X POST https://hillclimb.me/api/v1/tools/add_evidence \
  -H "authorization: Bearer $HILLCLIMB_API_KEY" -H 'content-type: application/json' \
  -d '{"tree": "acme", "outcome": "HC-16", "verdict": "confirms", "kind": "ci",
       "summary": "Deploy smoke test passed",
       "source": {"type": "system", "name": "github-actions"},
       "links": ["https://…/runs/123"]}'
```

### Keeping evidence lean

- An evidence body over 50,000 characters is refused. Summarize it, then link or attach the full log.
- Routine CI evidence (kind `ci`) is collapsed in default reads. `get_outcome` shows:
  - the latest CI piece for each criterion;
  - every piece that isn't CI;
  - whatever the current status cites.

  The rest are counted in `olderCiEvidence`. Pass `evidenceHistory: "all"` to read every piece. Nothing is deleted, and status, stale and broken are computed from all of it.

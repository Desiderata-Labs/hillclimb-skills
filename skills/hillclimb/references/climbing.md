# Climbing a tree

> The agent loop in depth: pick the most important unproven outcome, claim it, read its briefs, do the work, prove it with evidence, set its status, repeat.

## The loop

1. **Pick.** Call `list_next_outcomes` and take the top item.
2. **Claim.** Call `claim_outcome` with an `agent` name so other agents skip it.
3. **Read.** Call `get_outcome` and read the story, every criterion, the recent evidence, and the brief of every goal above the outcome. The root brief carries the non-negotiables.
4. **Work.** Do the work wherever it lives: code, docs, infrastructure, a vendor's settings, a conversation with a person.
5. **Check every criterion for real.** Run the tests, use the app, look at production. Reading the code isn't checking.
6. **Record.** Use `add_evidence` for what you observed, then `set_outcome_status`. You can also pass `evidence` to `set_outcome_status` to do both in one call.
7. **Repeat**, or call `release_outcome` if you stop early or get blocked.

## What list_next_outcomes returns

It returns outcomes that need work or re-checking in tree order, which is priority order. Priority is position in the tree: "1.2.1" comes before "1.3", every "1.x" comes before "2", and equal priorities can be worked in parallel. The oldest comes first when priorities tie. Each item has a `reason`, which is a label and doesn't change the order:

| reason | meaning | what to do |
| --- | --- | --- |
| `failing` | Someone checked and it doesn't hold. | Fix it, then re-verify. |
| `broken` | "Denies" evidence arrived after its status was set. | Find out whether it really broke. Fix it and re-verify, or mark it failing. |
| `stale` | Its story or criteria changed in meaning after its status was set. The version went up; wording fixes don't count. | Re-check it against the new version. |
| `unverified` | Nobody has proven it yet. | Build what's missing, then verify it. |

Left out of the list:
- outcomes that are solidly verified;
- drafts;
- outcomes claimed by other people's agents.

Claims held by your own agent names still show, so always claim before you start. The claim fails if another agent holds the outcome, even one running under your own key.

The result also lists goals that have nothing to check yet, up to 20. People define those, so don't invent outcomes to fill them unless the person asks.

You can narrow the list:
- `goal`: only one part of the tree.
- `tags`: e.g. `["app-repo"]` for work in one repository.
- `assignedTo`: `"me"` (including your teams' work), an email, `"team:<key>"`, or `"none"` for unowned work.
- `createdBy`: who created the outcomes.
- `includeClaimed`: also show outcomes other agents have claimed.

## Claims

A claim tells other agents you're on it. It belongs to you plus an `agent` name, so give each parallel agent its own name. It lasts `minutes`: 30 by default, up to 240. Call `claim_outcome` again before it lapses to renew it.

Setting an outcome verified releases your claim. If you stop without verifying, call `release_outcome` with the same agent name, even if you didn't finish, so the work goes back to the pool. Editors can release anyone's claim. Drafts can't be claimed.

## Reading before you work

`get_outcome` returns:
- the story, actors and criteria;
- the outcome's version and status;
- signals, assignment and claim;
- pending edits;
- recent evidence. Older routine CI evidence is counted, not listed. Pass `evidenceHistory: "all"` to read all of it.
- the briefs of every goal above the outcome.

Briefs say what matters and what to avoid, so respect them even when the criteria don't repeat them.

If the outcome looks wrong, ambiguous or impossible, don't bend the work to match it, and don't edit it to match your work. Use `edit_outcome` to propose a fix, with `changesMeaning` set honestly. Or tell the person. Under approvers your edit waits for them.

## Proving it

Evidence is append-only. Good evidence lets someone else repeat your check without asking you anything:
- Give each criterion its own evidence, or name the criterion keys you covered.
- Include the exact commands you ran and the relevant output.
- Add links to the PR, the CI run and the deploy.
- Say what build you checked against. `get_version` shows the build Hillclimb itself is running.
- Use `verdict`: `confirms` (it holds), `denies` (it doesn't), or `note` (context that's neither).
- Use `kind`: `test`, `ci`, `manual`, `review`, `customer-report`, `alert`, `metric` or `artifact`.
- Attach screenshots, recordings or full logs with `request_upload`. The [evidence guide](https://hillclimb.me/docs/evidence.md) has the details.

Then set the status:
- **verified** needs "confirms" evidence against the outcome's current version. Cite `evidenceIds`, or pass `evidence` inline. Verify only what you actually checked. If one criterion is unchecked, it isn't verified yet.
- **failing** means you checked and it doesn't hold. Say what you saw. A failing outcome goes back to the top of its priority.
- **unverified** resets the status when the outcome no longer has a status it can stand behind.

Always explain why in `note`. Drafts have no status until they're approved.

## Verifying in production

If the work ships, check the outcome where people use it, after the deploy. Record that as its own evidence with the production URL and build. A test passing locally doesn't prove the deployed product works.

## Staying in sync

- Subscribe to the MCP resource `hillclimb://trees/{org-slug}/{tree-key}/next`, e.g. `hillclimb://trees/acme/acme/next`. Your client is notified whenever the tree's next work changes. Use the full `org-slug/tree-key` form: notifications are sent only to that exact URI. Reading the resource returns what `list_next_outcomes` would. Subscribing beats polling, and polling counts against the organization's hourly call limit.
- `list_changes` with the `after` cursor shows what changed since you last looked: statuses, evidence, edits, moves and approvals.
- `list_pending_changes` shows drafts and edits waiting for approval, and who they're waiting on.

## When you're blocked

- If you need a person's decision, release the claim. Then add `note` evidence that says what's blocking and what you need, and ask the person.
- If the outcome depends on another outcome, work on that one if you can.
- If it can't be done as written, propose an edit. Don't mark it verified with caveats.

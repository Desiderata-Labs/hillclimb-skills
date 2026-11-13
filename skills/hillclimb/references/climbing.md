# Climbing a tree

> The agent loop in depth: pick the most important unproven outcome, claim it, read its briefs, do the work, prove it with evidence, set its status, repeat. Also finding things with search, and standups: who closed what over a window.

## The loop

1. **Pick.** Call `list_next_outcomes` and take the top item.
2. **Claim.** Call `claim_outcome` with an `agent` name so other agents skip it.
3. **Read.** Call `get_outcome` and read the story, every criterion, the recent evidence, and the brief of every goal above the outcome. The root brief carries the non-negotiables.
4. **Plan, when it's more than a small change.** Call `write_plan` on the outcome with how you'll do it, and take review comments with `list_comments` and `revise_plan`. See [plans and comments](https://hillclimb.me/docs/plans.md).
5. **Work.** Do the work wherever it lives: code, docs, infrastructure, a vendor's settings, a conversation with a person.
6. **Check every criterion for real.** Run the tests, use the app, look at production. Reading the code isn't checking.
7. **Record.** Use `add_evidence` for what you observed, then `set_outcome_status`. You can also pass `evidence` to `set_outcome_status` to do both in one call.
8. **Repeat**, or call `release_outcome` if you stop early. If something outside your control stops you, block it (see [When you're blocked](#when-youre-blocked)).

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
- blocked and deferred outcomes (see [Blocked and deferred](#blocked-and-deferred));
- outcomes claimed by other people's agents.

When everything that matches is blocked or deferred, the result has a `note` saying so. Ask a person rather than working on one.

Claims held by your own agent names still show, so always claim before you start. The claim fails if another agent holds the outcome, even one running under your own key.

The result also lists goals that have nothing to check yet, up to 20. People define those, so don't invent outcomes to fill them unless the person asks.

You can narrow the list:
- `goal`: only one part of the tree.
- `tags`: e.g. `["console"]` for one service or `["code-repo"]` for one repository. Several tags match any of them; `tagMatch: "all"` needs every one. `excludeTags` leaves an area out. `get_tree` lists the tags in use, and a `tagNote` flags a tag nothing carries. `list_tags` is the organization's vocabulary; an old name that was renamed or merged still works, and the result says which tag it became.
- `assignedTo`: `"me"` (including your teams' work), an email, `"team:<key>"`, or `"none"` for unowned work.
- `createdBy`: who created the outcomes.
- `includeClaimed`: also show outcomes other agents have claimed.

## Claims

A claim tells other agents you're on it. It belongs to you plus an `agent` name, so give each parallel agent its own name. It lasts the organization's claim length: 4 hours, 12 hours, 1 day, 5 days (the default) or never, which owners and admins set in organization settings or with `update_organization` (`claimLength`). `get_organization` shows it. Pass `minutes` for a shorter claim. Call `claim_outcome` again before it lapses to renew it; under "never", `until` is null and the claim holds until you `release_outcome` or the outcome is verified, so always release when you stop.

Someone else's claim means the outcome's status is theirs to change. `set_outcome_status` refuses to verify, fail or reset an outcome another person (or their agent) holds, and the error names them and when their claim lapses. Ask them on the outcome (`add_comment` with `to`), wait for the claim to lapse or be released, or tell your person whose claim it is: only once they say go ahead, call again with `confirmedWithPerson: true`. That releases their claim, the change records `overrodeClaim` (`list_changes` shows it), and they hear about it in their updates. If the holder can no longer see the tree, the error says so: ask an editor to release it, or confirm with your person. Your own agents' claims never block you. Inbound triggers allowed to set status (CI) aren't blocked and leave the claim in place, so release your claim yourself once CI has verified the outcome.

Setting an outcome verified releases your claim. If you stop without verifying, call `release_outcome` with the same agent name, even if you didn't finish, so the work goes back to the pool. Editors can release anyone's claim; an agent releasing another person's claim needs its person's go-ahead (`confirmedWithPerson: true`), and the holder hears about it. Drafts can't be claimed.

## Reading before you work

`get_outcome` returns:
- the story, actors and criteria;
- the outcome's version and status;
- signals, assignment and claim;
- pending edits;
- recent evidence. Older routine CI evidence is counted, not listed. Pass `evidenceHistory: "all"` to read all of it.
- its plans, if anyone wrote one. Read the plan in play with `get_plan` before you start, and any decisions answered on it.
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
- **verified** needs "confirms" evidence against the outcome's current version. Cite `evidenceIds`, or pass `evidence` inline. Verify only what you actually checked. If one criterion is unchecked, it isn't verified yet, unless a person deferred that criterion (see [Deferring one criterion](#deferring-one-criterion)).
- **failing** means you checked and it doesn't hold. Say what you saw. A failing outcome goes back to the top of its priority.
- **unverified** resets the status when the outcome no longer has a status it can stand behind.

Always explain why in `note`. Drafts have no status until they're approved.

## Verifying in production

If the work ships, check the outcome where people use it, after the deploy. Record that as its own evidence with the production URL and build. A test passing locally doesn't prove the deployed product works.

## Staying in sync

- Subscribe to the MCP resource `hillclimb://trees/{org-slug}/{tree-key}/next`, e.g. `hillclimb://trees/acme/7f3k2m9q/next`. Your client is notified whenever the tree's next work changes. Use the full `org-slug/tree-key` form: notifications are sent only to that exact URI, so any other spelling is refused with the URI to use. Reading the resource returns what `list_next_outcomes` would. Subscribing beats polling, and polling counts against the organization's hourly call limit.
- `list_changes` with the `after` cursor shows what changed since you last looked: statuses, evidence, edits, moves and approvals.
- A local copy synced by the `hillclimb` CLI (see "Searching a local copy") lets you search everything at once; it still isn't where you act.
- `list_pending_changes` shows drafts and edits waiting for approval and who they're waiting on. For an edit, it also shows what each field would change from and to.

## Standups and who moved what

`get_insights` answers "what did I (or we) get done?" for an organization over a window: `range` "24h" (the default), "7d" or "30d", or `from`/`to` dates (read in `tz`, at most 366 days). Pass `organization` when your person belongs to more than one, and `tz` (their IANA timezone) so days and hours line up with theirs.

- **Outcomes closed** is the one number that ranks people. Every verification counts, including re-verifying an outcome after it changed or broke: requirements drift, and fixing it is real work. Proving an outcome on a track (a rewrite) counts for whoever did it, when they did it; promoting the track doesn't count it again.
- **Evidence** added (live or on a track) is shown beside each person and never changes the rank.
- Your work and your agents' work are one person: results name people, never agents.
- People with nothing in the window aren't listed. Someone shared on part of a tree sees only the work on what they can see. The example tree a new account starts with never counts: its history is made up.
- `person` is someone in the organization (a member, on one of its teams, or shared on one of its trees), by email, user id or `me`.

With `person: "me"`, the result also has `standup`: `claimedNow` (live claims across the organization's trees, whatever the window), `waitingOnYou` and `waitingOnOthers` (open questions, the same as `list_inbox`). With another person's email you get their numbers and claims, never their questions. To write your person's standup, call it with `person: "me"` and the window they ask about, then `list_insight_items` (metric "closed", same window) for the outcomes, and link each one by its `url`.

`list_insight_items` lists the outcomes behind any number, newest first, 50 at a time: metric "closed" or "evidence", for everyone or one `person`, optionally one `bucket` (an hour or day exactly as `get_insights` names it in `buckets`). Each item has who, when, the tree, the track when it was done on one, and the outcome's live state now (verified, stale, broken, failing, unverified, archived, or gone). Pass `next` back as `cursor`.

Both only read: they don't carry the `inbox` field and mark nothing read. A window that takes too long is cancelled with an error that says to narrow it. People see the same numbers on the Insights page at https://hillclimb.me/insights.

## Finding things by what they say

`search` finds goals, outcomes, plans, evidence and artifacts by their words, the same search people get from ⌘K in the console. Every word of `query` has to appear, in any order, ignoring case. The words may be spread over an item's key and title (and over an artifact's title, folder and summary), but a brief, story, criterion or evidence summary has to hold them all itself.

- **Where:** every tree you can read in the organization, or one `tree`. Pass `organization` (its slug) when your person can read trees in more than one, as a member or shared on a goal there. Artifacts belong to the organization, not a tree, so a search with `tree` leaves them out (`artifactsNote` says so if you asked for them).
- **What it reads:** goals by title, key or brief; outcomes by key, title, a criterion or the story; live plans by title or the item they're on; evidence by its summary (not its body); artifacts by title, folder or summary (not their content). `types` narrows it, e.g. `["outcomes", "evidence"]`; by default it searches all five. Evidence is searched only when the query has a word of 3 or more characters.
- **Order:** best match first. A match in a key or title ranks above a match in the text under it, so `"HC-12"` or a title's words come first, then criteria, stories, briefs, folders, summaries and evidence. `limit` is 20 by default and 50 at most. `more: true` (with a `note`) means there are others, so add words or narrow the scope; a tree with more than 200 matching evidence entries says `more` too. Each tree searches its 500 most recently updated live plans, as the palette does; older plans aren't searched.
- **Each result:** `type` (goal, outcome, plan, evidence or artifact), `key` (for evidence, the outcome it's on, with the evidence's `id`; a plan has `id` and the `item` it's on), `title`, `matched` (the field that matched, e.g. "criterion" with its key in `criterion`), `snippet` (a short piece of that field around the match), `url`, and `tree` for anything in one. `draft: true` marks a goal or outcome still waiting for approval, and `track` marks evidence observed on a rewrite rather than live.
- **Access:** only what you could open in the console comes back: branches your person holds a role on, and their own private artifacts.

Search finds things; it doesn't rank work. Use `list_next_outcomes` for what to do next and `get_outcome` to read one before you start.

## Searching a local copy

When the folder you work in has a `.hillclimb/` directory (or your person keeps one in `~/.hillclimb`), the `hillclimb` CLI has synced a read-only copy of the trees there: `INDEX.md` (the ranked tree with statuses), `goals/`, `outcomes/` (criteria, status, signals and evidence), `plans/` (the latest version of each) and `artifacts/`. Search it like code, with `rg <words> .hillclimb` (always pass the path): it's faster than one call per lookup, and you can search Hillclimb and the code together. Frontmatter holds each item's key, priority, status and `url` as JSON values, so `rg 'status: "failing"' .hillclimb` finds failing outcomes.

- **It's a copy, not the tree.** Editing the files changes nothing in Hillclimb. Claim, add evidence, set status and write plans through the tools as always.
- **Check live before you act.** The copy can be minutes old. Read an outcome with `get_outcome` before you claim, verify or fail it, and use `list_next_outcomes` for what's next. `hillclimb workspaces` shows when each folder last synced; `hillclimb sync` refreshes it.
- **Big evidence is a stub** that names its id: `hillclimb fetch <id>` saves the full text next to it. `hillclimb fetch <outcome>@<n>` saves an earlier plan version.

You can set it up for your person when they ask you to sync Hillclimb, or for a repo you work in:

1. `npm i -g @hill-climb/cli` (or `npx @hill-climb/cli` in place of `hillclimb` everywhere).
2. `HILLCLIMB_NO_BROWSER=1 hillclimb login` in the background. Give your person the link and code it prints; they approve it in the browser, picking the account under "Connect as", and it prints "Signed in as …". The key goes into the OS keychain without passing through you. Running `login` again adds another of their accounts, and each organization syncs with an account that belongs to it (`hillclimb accounts` shows which).
3. `hillclimb link <tree key> --org <slug>` in the repo root. Name the trees: without a terminal it can't ask. The organization's artifacts come too (`--artifacts <space>` narrows them, `--no-artifacts` leaves them out); comments aren't synced. `--agents-line` and `--claude-hook` add an AGENTS.md section and a session-start sync hook; add them once your person agrees.
4. `hillclimb sync`. Use `--if-stale` from hooks, and don't loop it: the server sets a floor between syncs.

`hillclimb help` explains the rest.

## Linking people to the work

Tool results give the console link for what they name: `url` on trees, goals, outcomes, plans, releases and roadmaps (`list_next_outcomes` items, `get_outcome`, `get_plan`, `get_release`, `get_roadmap`, `list_changes` subjects, and what you create or edit). `get_tree` lists many items, so it gives `links.goal` and `links.outcome` instead: replace `{key}` with the item's key. When you mention one of these to a person, in chat, a comment, a pull request or a report, link it. Don't build these URLs yourself. They open for members of the organization; anyone else is asked to sign in.

## Blocked and deferred

Beside its status, every outcome is **open** (the default), **blocked** or **deferred**. Status still says only what the evidence shows; availability says whether it can be worked now. Changing one never changes the other.

The one test that separates the two:
- **Blocked**: we want it now, and something is stopping it. A machine nobody has, access that hasn't come through, a person who isn't helping today. Any reason is fine, in your own words.
- **Deferred**: a person chose not to do it now. Research that may not be worth it, an idea for later, something that depends on how the market goes.

| | who sets it | who clears it | next work and claims | coverage and releases |
| --- | --- | --- | --- | --- |
| blocked | anyone with contributor access, agents included | anyone with contributor access | left out; claims refused | still counts by its status, and in `blocked` |
| deferred | editors, or their agents after a clear yes (`confirmedWithPerson`) | the same | left out; claims refused | left out of the total, counted in `deferred`; refused while in an open release |

A goal whose outcomes are all proven or deferred counts as achieved for now; one whose outcomes are all deferred is open, not "no outcomes yet".

Block with `set_outcome_availability`: `availability: "blocked"`, a `note` saying what's stopping it, and optionally `until`, a date or time when it opens again on its own. Blocking frees every claim on the outcome, live and on tracks, and posts the note as a comment. If another person holds it, ask them first (they can block it themselves): an agent blocking someone else's claimed outcome needs its person's go-ahead (`confirmedWithPerson: true`), and the change records `releasedClaims`. That reaches whoever works on it and its owners; `to` tells anyone else. Clear it with `availability: "open"` once it's unstuck. Whoever blocked it sees it in the `updates` of `list_inbox` when someone else reopens it, and when its `until` passes (for two weeks after). These are updates, not questions, so they don't show in the `inbox` field of every tool result. When a block lapses at its `until`, no change is recorded and subscribers to next work aren't notified; the outcome is simply next work again from then on.

Defer the same way with `availability: "deferred"` and a `note`, only after your person said yes. Move it out of any open release first. Reopening something deferred is the same decision as deferring it.

Drafts, and outcomes verified live and on every track still proving them, can't be blocked or deferred. A deferred outcome can't be blocked until it's reopened. `list_blocked_and_deferred` lists every one you can see with its reason, who set it and when; `get_outcome` shows it under `availability`.

## Deferring one criterion

Sometimes a person wants an outcome now but not all of it: one criterion can wait. Defer just that criterion with `set_outcome_availability`, passing `criterion` (its key, such as `ac4`), `availability: "deferred"` and a `note` saying why. It's the same decision as deferring an outcome, so the same rules apply: editors make it, and an agent only after its person said yes (`confirmedWithPerson: true`).

- The outcome stays next work and can be claimed. Verifying it no longer needs the deferred criterion checked; say in the status `note` that it was verified without it.
- `get_outcome` marks the criterion with `deferred` (why, who and when), the tree panel shows it as Deferred, and `list_blocked_and_deferred` lists it under `deferredCriteria`.
- At least one criterion stays open: to set all of it aside, defer the outcome. Move the outcome out of any open release first.
- Reopen it with `availability: "open"` and the same `criterion`. If the outcome was verified while the criterion was deferred, reopening it makes the outcome stale until someone checks that criterion. Whoever deferred it hears when someone else reopens it.
- Editing the outcome's criteria keeps a deferral while its key stays; removing the criterion removes its deferral.

## Dependencies

An outcome can depend on others in its tree (`dependsOn`, set with `create_outcome` or `edit_outcome`). Position in the tree stays the priority people set; dependencies only change the order work is handed out:
- **What waits is blocked.** While any of its dependencies isn't proven, the outcome reads as blocked (`waitingOnDependencies` names them), leaves next work and can't be claimed. It opens on its own once the last one is proven, and whoever added the dependency and whoever it's assigned to hear about it. If a dependency stops being proven (failing, broken or stale), what waits on it is blocked again. What was already verified keeps its status and isn't blocked; when a dependency's status is set to failing or unverified, the verified outcome's people get a note (a dependency turning broken or stale sends none). A dependency only in a rewrite that hasn't gone live holds nothing up live.
- **A dependency takes the rank of what needs it.** If HC-40 sits at 1.2 and depends on HC-52 at 3.4, `list_next_outcomes` lists HC-52 where 1.2 would be, with `effectiveRank: "1.2"` (the rank it's listed at) and `neededBy: "HC-40"` (the outcome that rank comes from). It takes the highest rank of everything that needs it, through chains of dependencies too. Its `priority` and the tree don't change. `get_outcome` shows the same as `effectiveRank` and `effectiveRankFrom`; its `neededBy` lists every outcome that depends on it directly.
- **Tension is shown, not fixed.** When a dependency ranks below something that needs it, `get_outcome` and `get_tree` list it under `dependencyTension`. A person may move it up (`move_outcome`), or leave it where it is on purpose.

Someone shared on one branch sees only the dependencies on it: others are counted (`waitingOnHidden`, or `state: "hidden"` in `get_outcome`), never named, and their edits keep them as they are.

Rules: dependencies stay in one tree, at most 20 per outcome. A dependency that would close a loop is refused, and the error names the loop. A dependency on a draft holds nothing up until the draft is approved, and one that's archived (or under an archived goal) no longer holds anything up; `get_outcome` marks it `gone`. On a track, an outcome waits on dependencies not proven on that track. Adding or removing a dependency is an edit, so under approvers it waits for sign-off like any other.

Found a dependency mid-work? Propose it with `edit_outcome` (`dependsOn`), then work on the dependency if you can.

## When you're blocked

- If something outside your control stops you, block the outcome with a reason (`set_outcome_availability`, `availability: "blocked"`), so no other agent picks it up and the people who can unstick it hear about it. Then take the next item.
- If you need a person's decision, ask them in a comment on the outcome: a question (`add_comment` with `to` and `options`) waits on them, and their reply reaches you in the `inbox` field of your tool results. Keep working on what doesn't depend on it; release the claim if nothing does. If your work overlaps another outcome, ask the agent working on it (`to: ["agent"]`) before changing what they depend on.
- If the outcome depends on another outcome, add it to `dependsOn` with `edit_outcome` so the order is recorded, and work on that one if you can.
- If it can't be done as written, propose an edit. Don't mark it verified with caveats.
- If you think it isn't worth doing now, say so to your person. Deferring it is their call.

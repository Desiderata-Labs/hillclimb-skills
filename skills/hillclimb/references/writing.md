# Writing goals, outcomes and criteria

> What a great goal brief, outcome and criterion read like, the checks to run before you create or edit one, where details that don't belong go instead, and how to review a tree and propose rewrites a person can accept or reject one by one.

A tree is a definition of how the product behaves. It changes when the product changes, not every time someone finds a bug or finishes a task. Read this before `create_goal`, `create_outcome` or `edit_outcome`, and run its checks on what you wrote.

## What great looks like

### An outcome

> **Free workspaces can't use paid exports**
>
> As the business, I want a Free workspace that asks for a paid export format to be refused, so that paid exports stay a paid feature.
>
> - **ac1**: Given a Free workspace, when someone asks for a PDF export, then it is refused, nothing is generated, and the refusal says the format needs a paid plan.
> - **ac2**: Given a Free workspace, when the same export is requested through the API, then the refusal is the same.

> **An outage in key checks reads as retryable, not as a sign-out**
>
> As a developer mid-session, I want an outage in key validation to return a retryable error, so that my tools retry instead of treating my key as revoked.
>
> - **ac1**: Given key validation can't complete, when a request arrives with a valid key, then the response is 503 with retry guidance.
> - **ac2**: Given validation confirms the key is revoked, when a request arrives, then the response is 401.
> - **ac3**: Given a rate limit applies during validation, when a request arrives, then the response is 429, never an invalid-key error.

> **Fixing a typo doesn't reset verified work**
>
> As a product manager, I want to fix wording without re-verifying, so that only real changes in meaning send work back.
>
> - **ac1**: Given a verified outcome, when its wording is fixed without changing its meaning, then it stays verified.
> - **ac2**: Given a verified outcome, when a criterion's meaning changes, then it shows as stale until someone checks it again.

What they share:
- **The title is the behavior, as a present-tense fact.** Someone who reads only the title knows what the product does.
- **The story is one sentence:** one actor, what they want, and the harm avoided. No history, no policy tables.
- **One to five criteria.** Each is one case: the main path, the edges that matter, the failure path. The third example's two criteria are the two sides of one boundary; that's often all an outcome needs.
- **Each result is observable from outside:** a status, what a person sees, what's charged, what's written where someone can look. Two strangers would agree on pass or fail.
- **Results say what doesn't change, too,** when that's the risk: "it stays verified", "the refusal is the same".
- **Nothing about who decided it, when, or in which ticket.** That's history, and history lives in evidence and decisions.
- **"Every quarter" isn't a criterion.** When proof goes out of date on a schedule (an access review, a restore drill, a certificate check), write the promise once and set `recheckEvery` in days instead. The outcome comes back as next work when its confirming evidence gets older than that, and stays verified meanwhile. Leave it unset when proof doesn't age.

### A goal brief

> **Customers can always get their data out**
>
> Every customer can export everything they've put in, in an open format, without asking support. Exports never slow down normal use or include another customer's data.

Two or three sentences, under about 400 characters: what's true when it's achieved, what it covers, and what to keep or avoid. A goal is a lasting condition, so its title still reads true a year from now.

A root, or a goal over a large area, can carry more: a short **What matters** and **Avoid** list that steers everyone working under it, each rule with its reason in a clause. That's still a brief, not a plan: every line is a rule someone could break, none is history.

## Checks

Run these on every goal and outcome you create or edit, and on any you review. Each check has a code, so a review can cite it.

### Outcomes

- **O1 Behavior title.** The title states what the product does. Flag titles that start with "Bug:", that name work instead of behavior (add, build, fix, measure, decide, document, migrate, cut over, install, set up, investigate), or that promise a feeling nobody could check ("a timeline people want to share").
- **O2 One-sentence story.** "As a …, I want …, so that …", under about 300 characters. Flag a story that carries history, causes, file names, rulings, a data model or a screen layout.
- **O3 One to five criteria.** Flag more than seven: the outcome holds several behaviors (split it) or a test plan (move the cases to a plan). Flag a single criterion that only restates the title.
- **O4 One behavior.** If the criteria split into groups a person would check separately (say, what a page shows, how it works on a phone, and what an API returns), they're separate outcomes.
- **O5 A behavior, not a task.** Flag outcomes that are finished when something is done once, such as a measurement taken, a decision made, a document written, a migration run, a cutover, or a service switched on for a customer. Measurements and decisions are evidence for a behavior. One-off work belongs in a plan or a task list.
- **O6 Still true.** When a decision changes how the product behaves, every criterion that states the old rule changes with it. Flag criteria that contradict a newer decision, another outcome, or the product itself. Outcomes that remove or reverse something ("no longer", "has no", "is gone") are the usual source: for each, search the tree for criteria that still state the old rule ("only people approve plans" beside "plans have no approval").

### Criteria

- **C1 One case each.** A criterion that needs "and separately" or "in the first case … in the second case", or a "then" listing several unrelated results, is more than one criterion.
- **C2 Observable result.** The "then" says what someone outside the code could see. Flag results that name internal rows, functions or flags when a visible result exists ("the workspace is on Free", not "the subscription row is written with plan free"). Flag results nobody could check: "feels fast", "is clear", "people want to share it".
- **C3 Short.** Under about 300 characters is typical. Flag anything over 500.
- **C4 No provenance.** Flag people's names used as the source of a rule, dates, ticket and PR numbers, commit hashes, "verbatim", "per X's ruling", "approved on". Move them to evidence or decisions. Named people as example actors ("Given Sam asks a question") are fine.
- **C5 No implementation detail.** Flag file paths, line numbers, class and function names, internal settings, host names, and exact layout values (pixel sizes, colors, timings, step sizes). Keep a name when it's the interface the actor uses, such as a CLI command, an API endpoint or tool, or a documented setting. Keep a number when it's the promise, such as a limit customers rely on.
- **C6 No test plan.** Flag run counts, environment and machine setup, fixture lists, step-by-step procedures, and lists of every failure to try ("stale caches, lost events, failover, partitions, clock skew…"): the criterion states the promise that holds through them ("no request is lost or served twice when a node fails"). Those go in a plan or in the evidence that proves the criterion.
- **C7 State success, not the old bug.** "joins as a second owner", not "joins without an HTTP 500".
- **C8 Behavior, not the definition of done.** Flag criteria that only say the docs were updated, tests pass, a version was bumped or CI is green. How the team ships is its own process, not the product's behavior. Keep docs in a contract only where the docs are what the actor uses, and say what the reader can then do. This is about chores added to a feature's criteria. An outcome whose whole promise is a safeguard, such as "CI blocks a pull request that breaks the build" or "no model SDK ever ships", is a behavior people rely on, and passes.
- **C9 No project notes.** Flag "arrives with …", "until … ships", "see HC-…" and other references to other outcomes' timing. They go stale on their own. An outcome that needs another first says so with `dependsOn`.

### Goals

- **G1 Short brief.** Two or three sentences, under about 400 characters; flag anything over 800. A What matters and Avoid list (above) can run longer; flag one over about 3,000 characters.
- **G2 No plan or history in the brief.** Flag dates, steps, causes, designs, quotes and rulings, limits tables, branch names and file paths. A plan goes in `write_plan`, a design in an artifact, and a ruling is a decision.
- **G3 A lasting condition.** Flag goals that are projects ("Replace the old service", "Launch v2"), that name a technology or vendor ("Files live in object storage"), or that describe the mechanism instead of what people get ("Reads are cached", "It doesn't reload on every call"). Write the condition the project brings about ("Large files never slow the app or the bill"), and track the project as a release or a plan.
- **G4 Still true.** Flag briefs whose dates or targets have passed.

### Placement

- **P1 Criterion, not sibling.** A new behavior that refines an existing outcome becomes a criterion on it, not a new outcome beside it. Search first (`search`, or `rg` in a `.hillclimb/` copy). Flag an outcome whose whole subject is one edge case of another's behavior ("a new version keeps the fields the publish leaves out" under "publishing again adds a version"): it's usually a fixed bug that grew its own outcome.
- **P2 Generalize the bug.** A bug becomes the behavior it broke: a criterion on the outcome that owns that behavior, or a new outcome if none does. Its debugging notes become evidence (a "denies" while it's broken).
- **P3 Not in the tree at all.** Decisions, measurements, one-off gates, documents, finished chores and pure polish (a control's exact size, a renamed route) don't belong in the tree as outcomes. Record what they established as evidence on the outcome they inform, or fold the polish into that outcome's criteria if it's a promise, then archive them.

## Where the extra detail goes

| You want to keep | Put it in |
| --- | --- |
| Who decided and when, a ruling, an approval | A decision: ask with `add_comment` (`needsReply`), and the answer is kept |
| A ticket, PR, commit or debugging trace | Evidence on the outcome (`add_evidence`): "denies" while broken, "confirms" once fixed, "note" for context |
| Test matrices, run counts, environment setup, step plans | A plan (`write_plan`) |
| A design, data model, rationale or long policy table | An artifact (`publish_artifact`), linked from the brief or the plan |
| Waiting on another outcome | `dependsOn` on the outcome that waits |
| One-off work with no lasting behavior | A plan, a release or a task list outside the tree |

## Before and after

**A bug filed as an outcome.**

Before:
> **Bug: accepting an invite returns a 500 when the invitee already has an account**
>
> As an invitee, I want the invite to work. On the 3rd, a customer clicked their invite while signed in and got an error page. Cause: `acceptInvite()` in `invites.ts:142` inserts a second user row…

After, as a criterion on the outcome that owns joining an organization:
> **ac4**: Given an invite to someone who already has an account, when they open it signed in, then they join the organization with the invited role and keep their existing account.

The incident, the file and the line become "denies" evidence until the fix ships. The bug outcome is archived after its evidence is carried over (`carry_evidence`).

**A rule buried in internals.**

Before:
> Given an account with `is_internal = true` (set only by the seed job), when it calls the API with `LIMITS_MODE=enforce`, then the limiter skips it.

After:
> Given the operator's health-check account, when it sends requests, then rate limits never refuse it, and no customer account can claim the same exemption.

**A feature spec in one outcome.**

Before: one outcome with nine criteria covering what a dashboard ranks, the side panel's keyboard shortcuts, how it lays out on a phone, the API that returns the same numbers, and a note that filters "arrive with" another outcome; plus a story holding the screen layout.

After: one outcome for what the dashboard counts and ranks, one for the API that returns the same numbers, and the phone layout as one criterion ("stays usable at phone width with no horizontal scrolling") on the first. The layout notes go in a plan, and the filters' outcome gets `dependsOn` if it needs the dashboard first.

## Reviewing a tree

When a person asks you to review or lint a tree, or part of one:

1. Read it: `get_tree` for the shape, then `get_outcome` (or the `.hillclimb/` copy) for each goal and outcome in scope.
2. Run the checks above. Report only real findings. A long criterion that's still one clear case can pass. Name what's already great too, so the person sees what to keep. Where you can check a criterion against the product (its docs, its code, a live call), do: an outcome that no longer describes the product is the most valuable finding, so list those first.
3. For each finding, draft the fix. Default to proposing new wording, not just naming the problem:
   - a rewritten title, story or criterion, keeping the behavior and dropping what C4 to C6 and C8 to C9 flag;
   - for P1 and P2, the parent outcome and the criterion it would gain;
   - for P3 and O5, what to record as evidence and where, and that it would then be archived;
   - for O6, the newer decision and the criterion that has to change.

   Weigh what an edit costs. Any change an agent makes to a verified outcome's criteria makes it stale until someone re-checks it, so don't propose wording-only fixes (capitals, punctuation, rephrasing that keeps the meaning) to verified criteria on their own. Mention them in one closing line, to fold into the next real edit of those outcomes.
4. Present the findings as a list the person can answer yes or no to, one row at a time, most valuable first: out of date (O6), then splits, tasks and bugs, then wording. When one problem repeats across many outcomes, give it one sweep row with a couple of worked examples, every key it covers, and an offer to draft them all, rather than a row each. In a large tree, run the countable checks (lengths, criteria counts, names, dates, ticket ids, paths) on every item, not a sample, and make sure everything over a hard limit (O3 over seven, C3 over 500, G1 over 800) appears in some row.

| # | Item | Check | Now | Proposed | Moves to |
| --- | --- | --- | --- | --- | --- |
| 1 | PAY-12 ac3 | C4, C5 | the current text | the rewrite | provenance to a note on PAY-12 |

5. Apply only the rows they accept:
   - wording: `edit_outcome` or `edit_goal`, with `changesMeaning` set honestly (an agent changing criteria always counts as true, so a verified outcome goes stale until it's re-checked);
   - folds: the steps in [Reshaping](https://hillclimb.me/docs/shaping.md#reshaping), so verified work stays verified;
   - archives: `archive_outcome` after its evidence is carried and the person has said yes.

   Under approvers, your edits wait as pending changes for a person to approve.
6. Record what moved. Provenance you removed from a criterion goes into a "note" evidence on that outcome, so nothing is lost.

Never rewrite an outcome so work passes, and never change what a criterion promises without saying so in the row.

# Shaping a tree

> Design a tree people and agents can climb: goals and briefs, priority by position, outcomes with checkable criteria, tags, owners, templates, views, importing user stories, and reshaping safely.

## What a good tree looks like

A tree is a company's priorities written down so an agent can act on them:
- **The root** is the company or product. Its brief is the charter: who it serves and the non-negotiables that apply to everything.
- **A few top goals** are the objectives, ranked by importance. Three to seven is typical. Rank them by what matters most to the business, not by system. Systems (the API, the app, infra) nest under the objectives they serve.
- **Goals under those** narrow down to key results or focus areas, each small enough to finish.
- **Outcomes** sit at the leaves. Each one is a checkable result.

A goal with nothing under it is "undefined". `list_next_outcomes` lists it, up to 20 of them, so people can define it.

Keep it shallow. Two or three levels of goals is usually enough. The hard limits are 12 levels deep and 5,000 goals and outcomes per tree, archived ones included.

## Priority is position

Nobody sets "P1". Order comes from where something sits. `rank` orders siblings. Goals and outcomes under the same parent share one ordering, and equal ranks mean parallel work. Moving a goal (`move_goal`) moves everything under it, so priorities change in one move.

When you propose a tree, explain the order. Leaders will read the top of it as "what we do first".

## Briefs

Every goal can have a brief, written in markdown. Use it for:
- **Intent:** why this matters.
- **Non-goals:** what not to do.
- **Guardrails:** constraints like cost, privacy or compatibility.
- **Definition of done.**

Agents read the briefs of every goal above an outcome before they work on it, so a brief steers all the work beneath it. Keep briefs short, specific and true.

## Outcomes

Create outcomes with `create_outcome`. Write each one as a user story with criteria someone could actually check:

- **title**: the result, stated as a fact. For example: "Patients get a reminder the day before".
- **story**: "As a …, I want …, so that …".
- **actors**: who's involved.
- **criteria**: Given/When/Then, each with a stable key such as `ac1`. One behavior per criterion. Make them concrete enough that two people would agree on pass or fail.
- **tags**: where the work happens. For example `app-repo`, `infra` or `docs`. Agents filter next work by tag.
- **assignees**: people, or a team through `assign_team`.

Outcome keys look like `HC-12`: an uppercase prefix, a dash, then letters or digits. If you leave the key out, it's generated from the tree's initials. Goal keys are lowercase slugs like `connect-node`. Keys are unique within a tree and stay taken after archiving.

Avoid outcomes that only say "build X". Say what's true when X works, and how someone could tell.

## Templates and levels

`create_goal` with no parent starts a new tree, and `list_templates` lists starting points:
- `business`
- `big-rocks`
- `okrs`
- `kpi-tree`
- `flat`

You can edit or delete everything a template creates.

Starting a tree takes an organization owner, admin or editor. Contributors can't.

A `level` is a label on a goal, such as "Objective" or "Key result". Without one, goals are shown in OKR terms by depth: Objective, Key result, Initiative.

A view (`create_view`, `list_views`) renames the levels below the root for the whole organization, for example `["Theme", "Bet", "Task"]`. The last label repeats for deeper goals. A view never changes structure or order. Organization owners, admins and editors can create views.

## Approvers and drafts

Name approvers on a goal and they govern everything under it. In practice, put the people who own the direction on the root, and narrow it further down where a team owns its part.

- Approvers inherit down the tree.
- An empty list (`[]`) turns sign-off off for that subtree. `null` (in `edit_goal`) inherits again.
- Only editors and above can set approvers.
- Approvers must be organization members or people the tree is shared with.

Under approvers, the following wait for every approver to sign off:
- new goals and outcomes, and edits to their contract (title, brief, story, criteria), from anyone who isn't an approver;
- the same changes from any agent, even one signed in as an approver. Any MCP or API-key connection counts as an agent.

A new goal or outcome waits as a draft. An edit waits as a pending change. Drafts have no status and aren't next work, and a goal under a draft is a draft too. `list_pending_changes` shows what's waiting and on whom. Approvers sign off themselves in the Hillclimb console (https://hillclimb.me/t). That sign-off is `approve_change`, which refuses any agent connection. They can also send a change back, and so can you with `reject_change` if the person asks.

As an agent, you can always propose. Never ask the person to approve something they haven't read.

## Changing an outcome

Use `edit_outcome` to change title, story, actors or criteria. You must say whether the change alters meaning:
- **`changesMeaning: true`** bumps the version. A verified outcome then becomes stale and needs re-checking. When an agent changes the criteria, it always counts as true.
- **`changesMeaning: false`** is a wording fix. The status stands.

`tags`, `assignees` and `criteria` each take the full new list. Never change an outcome so your work passes. If it's wrong, propose the change and say why.

## Reshaping

- `move_goal` and `move_outcome` change where something sits. Status and evidence come along. Moving a tree's root under another tree's goal mounts it into the bigger tree. Both trees must be in the same organization, and you need to be an organization owner or admin.
- `archive_goal` and `archive_outcome` remove something and keep its history. No tool brings it back, so archive deliberately.
- `archive_tree`, `restore_tree` and `delete_tree` act on a whole tree. Confirm with the person first.
- Moving and archiving need editor access. Agents can't move or archive anything under approvers. Ask a person to.

## Bringing existing work in

`import_user_stories` takes user-story JSON files and imports them under a goal. Each file looks like:

```json
{ "domain": "billing", "title": "Billing",
  "sections": [{ "id": "invoices", "title": "Invoices",
    "stories": [{ "id": "BL-01", "actors": ["customer"], "story": "As a customer…",
      "acceptance": [{ "id": "ac1", "given": "…", "when": "…", "then": "…" }],
      "validation_evidence": [] }] }] }
```

- Each file becomes a goal, each section a goal under it, and each story an outcome with the same key, tagged `imported`.
- Validation evidence comes in as notes, and every status starts unverified.
- Story ids must be valid outcome keys.
- Running it again skips keys that already exist.

To fit the stories into a different hierarchy:
1. Import under a temporary goal.
2. `move_outcome` each story to where it belongs.
3. Archive the empty goals.

To migrate a backlog or ticket tracker, don't make an outcome per ticket. Write outcomes for the behavior the tickets add up to. Then attach the tickets as evidence: shipped work confirms, open bugs deny, and context goes in as a note. Read the [evidence guide](https://hillclimb.me/docs/evidence.md) for how to write evidence that holds up.

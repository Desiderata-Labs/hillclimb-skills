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

Hillclimb renders markdown the same way wherever people read it: briefs, plans, comments, evidence, release non-goals and artifacts. It's GitHub-flavored, so tables, task lists, fenced code, images and links work, and a video file (.mp4, .webm, .mov) written as an image or as a link alone on its line plays inline. Raw HTML is dropped, never run. In comments and evidence a single line break is kept; elsewhere, leave a blank line between paragraphs.

## Outcomes

Create outcomes with `create_outcome`. Write each one as a user story with criteria someone could actually check:

- **title**: the result, stated as a fact. For example: "Patients get a reminder the day before".
- **story**: "As a …, I want …, so that …".
- **actors**: who's involved.
- **criteria**: Given/When/Then, each with a stable key such as `ac1`. One behavior per criterion. Make them concrete enough that two people would agree on pass or fail.
- **tags**: where the work happens: a service, a repository or an area, such as `console`, `api`, `code-repo` or `infra`. People and agents filter next work by tag to climb the areas they know or are focused on. Tags are kebab-case (`Code repo` is `code-repo`): call `list_tags` first and use the organization's names.
- **assignees**: people, or a team through `assign_team`.
- **dependsOn**: keys of outcomes in the same tree it can't be done without. Rank still says what matters most; a dependency only means "this first". The outcome stays blocked until they're verified, and next work serves each dependency at its priority. See [Dependencies](https://hillclimb.me/docs/climbing.md#dependencies).

Outcome keys look like `HC-12`: an uppercase prefix, a dash, then letters or digits. If you leave the key out, it's numbered from the tree's outcome prefix: its title's initials by default, which an editor can change with `edit_goal` (`outcomePrefix`) on the root. Every other key (trees, goals, releases, roadmaps, scenarios, tracks, views) is 8 random lowercase letters and digits that Hillclimb assigns, like `q8d2x0ra`: you never choose one, and a title can repeat without taking anything from anyone. URLs and results show `slug~key` (`onboarding~q8d2x0ra`); the slug is the title made readable, and only the key finds anything, so renaming never breaks a link.

Avoid outcomes that only say "build X". Say what's true when X works, and how someone could tell.

## Research, someday and blocked work

Keep the outcome in the tree even when it shouldn't be worked yet, so its thinking isn't lost, and set its availability with `set_outcome_availability` (the [climbing guide](https://hillclimb.me/docs/climbing.md#blocked-and-deferred) has the rules):
- **Deferred** when you've chosen not to do it now: research that may not be worth it, an idea for later. It leaves next work and coverage until a person reopens it. Deferring is your person's call.
- **Blocked** when it's wanted now but something is stopping it, like "Build a Windows app" with no Windows machine to test on. It stays in coverage, shown as stuck.

"Blocked by another outcome" is better said with `dependsOn`: it opens on its own once that outcome is verified.

For research, write the question as its own open outcome, such as "We know whether a Windows app is worth building", with criteria that say what an answer looks like. Its evidence decides whether the deferred outcome gets reopened or archived.

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

A new goal or outcome waits as a draft. An edit waits as a pending change. Drafts have no status and aren't next work, and a goal under a draft is a draft too. `list_pending_changes` shows what's waiting and on whom, and what each edit would change, field by field. Approvers sign off themselves in the Hillclimb console (https://hillclimb.me/t). That sign-off is `approve_change`, which takes the `proposedAt` that `list_pending_changes` showed, so it covers exactly the draft or edit that was read; anything changed since is refused. They can also send a change back, and so can you with `reject_change` if the person asks.

As an agent, you can always propose. Never ask the person to approve something they haven't read.

## Changing an outcome

Use `edit_outcome` to change title, story, actors or criteria. You must say whether the change alters meaning:
- **`changesMeaning: true`** bumps the version. A verified outcome then becomes stale and needs re-checking. When an agent changes the criteria, it always counts as true.
- **`changesMeaning: false`** is a wording fix. The status stands.

`assignees` and `criteria` each take the full new list. For tags, `addTags` and `removeTags` change one or two and keep the rest (`tags` still replaces them all); rename one with the old name in `removeTags` and the new one in `addTags`. Tag changes apply at once, without sign-off. Never change an outcome so your work passes. If it's wrong, propose the change and say why.

## Tagging by area

Tags are optional. Use them for where or what the work is, such as the service it lives in (`console`, `api`, `billing`), so people can climb the areas they know.

- `get_tree` returns `tags`: every tag in use under that goal, with how many outcomes carry it and how many need work. Pass `tags` (and `tagMatch: "all"` or `excludeTags`) to see only that area: goals with nothing in it drop out, and coverage counts only the matching outcomes. `coverageByLevel` still describes the whole tree; read `filteredCoverageByLevel` for the area's progress by level.
- `tag_outcomes` adds or removes tags on many outcomes at once, by `outcomes` keys or by `goal` (everything under it) narrowed with tag filters. Tag a whole area with `goal` and `add: ["console"]`; rename a tag in one tree with `tags: ["web"]`, `add: ["console"]`, `remove: ["web"]`. To rename one across the whole organization, use `rename_tag` or `merge_tag` below.
- A filter naming a tag no outcome carries comes back with a `tagNote` saying so, which usually means a typo.
- `untagged: true` (on `get_tree`, `list_next_outcomes` and `tag_outcomes`) finds outcomes with no tags at all, the easy way to see what still needs tagging. Use it instead of `tags`. `list_tags` counts them as `untaggedOutcomes`.

### The tag vocabulary

An organization keeps one shared vocabulary of tags, so every tree and agent tags the same way. Tags are optional: nothing requires an outcome to have one, and nothing requires a tag to be in a group.

- `list_tags` returns the groups, each tag's description and aliases, how many outcomes use it, tags with no group under `uncategorized`, and names in use that nobody has added yet under `unmanaged`. Read it before tagging, and use a name from it when one fits. Tags say where or what the work is, such as the system, a subsystem or an area. Don't use them for status (that's the outcome's status) or where an outcome came from.
- Tags are kebab-case: `Code repo` and `code-repo` are one tag.
- Tagging with a name that isn't in the vocabulary still works and the name is kept. The result's `tagNotes.unmanaged` names the nearest vocabulary tags, so a typo is easy to catch.
- Organization owners, admins and editors shape the vocabulary: `create_tag` adds a tag (or adopts a name already in use) with a description and optionally a group, `edit_tag` changes its description or group, and `save_tag_group` and `delete_tag_group` manage groups, which are only a way to sort tags and carry no rules. Deleting a group keeps its tags as uncategorized.
- `rename_tag` and `merge_tag` change the tag on every outcome in the organization's trees at once, and never change an outcome's version or status. By default the old name stays as an alias: an agent that still says the old name tags and filters as the new tag, and the result's `tagNotes.redirected` says which name to use next time. Pass `alias: false` to leave no alias, so the old name is free again. `remove_tag_alias` frees a name later; outcomes already moved stay moved. A new tag can't take a name that is currently an alias.
- `retire_tag` stops a tag being used: tagging with it is refused with the tag to use instead. Outcomes keep it as history, or lose it with `outcomes: "remove"`. `create_tag` on the name brings it back.
- `rename_tag` keeps a retired tag retired, and `merge_tag` refuses a retired target. Renames and merges rewrite archived trees too, so a restored tree comes back with current names; `list_tags` counts only live trees and leaves out the example tree.
- `rename_tag`, `merge_tag`, `retire_tag` and `remove_tag_alias` rewrite many outcomes or can't be undone, so ask the person first.

## Reshaping

- `move_goal` and `move_outcome` change where something sits. Status and evidence come along. Moving a tree's root under another tree's goal mounts it into the bigger tree. Both trees must be in the same organization, and you need to be an organization owner or admin.
- `archive_goal` and `archive_outcome` remove something and keep its history. No tool brings it back, so archive deliberately.
- `archive_tree`, `restore_tree` and `delete_tree` act on a whole tree. `delete_tree` also removes the tree's evidence files from storage. Confirm with the person first.
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

- Each file becomes a goal, each section a goal under it, and each story an outcome with the same key, tagged `imported` (unless the organization has retired that tag).
- Validation evidence comes in as notes, and every status starts unverified.
- Story ids must be valid outcome keys.
- Running it again skips keys that already exist.

To fit the stories into a different hierarchy:
1. Import under a temporary goal.
2. `move_outcome` each story to where it belongs.
3. Archive the empty goals.

To migrate a backlog or ticket tracker, don't make an outcome per ticket. Write outcomes for the behavior the tickets add up to. Then attach the tickets as evidence: shipped work confirms, open bugs deny, and context goes in as a note. Read the [evidence guide](https://hillclimb.me/docs/evidence.md) for how to write evidence that holds up.

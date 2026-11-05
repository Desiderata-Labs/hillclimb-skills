# Best practices

> Patterns that work in real trees: how to write the charter, phrase objectives and key results, size goals, handle KPIs and triage, migrate a backlog, and wire a repository so agents climb it every day.

These patterns come from trees that teams climb every day. Use them as defaults and change what doesn't fit.

## The charter (root brief)

Keep it to about 100 to 200 words, in three parts:

1. **Purpose and audience.** One paragraph on what the business does and who it serves.
2. **Non-negotiables.** Five to eight bullets that must hold for every piece of work, such as:
   - security and isolation rules;
   - "nothing turns green by assertion";
   - cost or simplicity constraints;
   - who has the final say.
3. **System of record.** One sentence saying this tree decides what gets built next, and in what order.

Agents read the charter before every outcome, so write each non-negotiable as a rule someone can check, not as an aspiration.

## Levels

A tree that works well usually looks like this:

```
Company (root, the charter)
└─ Objective        5–7, ranked by business importance
   └─ Key result    2–5 per objective
      └─ Focus      optional, only where a key result gets crowded
         └─ outcomes
```

- **Objectives hold no outcomes directly.** Outcomes hang off key results, or off focus goals.
- **Split a key result into focus goals** once it holds more than about 15 to 20 outcomes. Most key results hold between 3 and 15.
- **Label every goal's level** ("Objective", "Key result", "Focus"), so reports and `coverageByLevel` read naturally.

## Phrase goals as what will be true

Objectives and key results are short, present-tense statements of a result. They aren't nouns, project names or system names:

| instead of | write |
| --- | --- |
| "Billing" | "Customers are billed exactly for what they use" |
| "API v2" | "Every request is answered within its latency budget" |
| "Infra" | "Costs stay small as usage grows" |

Some templates that work for key results:
- "⟨Actor⟩ ⟨does⟩ ⟨thing⟩ without ⟨help/friction⟩"
- "Every ⟨unit of work⟩ ⟨meets⟩ ⟨its constraint⟩"
- "⟨Quality⟩ stays ⟨within bound⟩ as ⟨scale grows⟩"

Systems (the API, the apps, the CLI, the infrastructure, the models) belong **under** the objectives they serve, never as top-level buckets. If an objective needs several systems, give each its own key result or focus goal.

## Rank promises first

Put the objective that protects your invariants first: correctness, isolation, security, keeping data, and the product staying up. It's the one thing you can't trade away. Growth, adoption and cost come after. When the order is right, an agent that only ever takes the top item still does the right thing.

## Briefs at every level

Give every objective and key result a brief of one to three sentences:
- what it has to prove;
- what to avoid claiming;
- any guardrail specific to that part of the tree.

Short briefs get read. Long ones get skimmed.

## Outcomes

- **One behavior per outcome.** Usually one to four criteria, each checkable on its own.
- **Write criteria a stranger could check.** Name the actor, the starting state, the action and the observable result.
- **Tag where the work happens**, e.g. `app-repo` or `infra`, so agents in one repository can filter next work to it.

## KPIs and forward-looking outcomes

Some outcomes are measurements, such as "50 teams are active every week for four weeks running". Tag them `kpi` and put the measurement window in the criteria. Until the window has passed, record what you know as `note` evidence with kind `metric`, and leave the status unverified with a note saying what would prove it. Never verify a KPI early.

## Triage

When you import a backlog, some items won't fit anywhere yet. Put them under a **Triage** goal ranked last, with a brief saying it holds work waiting for review. Then go through it regularly:
- move the items that matter into place;
- write real outcomes for them;
- archive the rest.

A tree that ends in a growing triage pile is a tree people stop trusting.

## Migrating tickets

Tickets record work done, not behavior. When you bring in a tracker:

1. Write outcomes for the behavior the tickets add up to.
2. Attach each ticket as evidence on the outcome it touches:
   - shipped work **confirms**, with the ticket link;
   - an open bug **denies**, which puts the outcome back in next work;
   - context goes in as a **note**.
3. Skip chores and noise, and send anything ambiguous to triage.
4. Tag outcomes you inferred from code or tickets, rather than ones a person wrote, with `derived`. Reviewers can then find them.

Expect a migrated tree to start mostly unverified, with a fair number of failing and broken outcomes. That's an accurate picture, and it's what agents climb.

## Wire the repository

Put the loop in the repository's `AGENTS.md` (or `CLAUDE.md`) so every agent session climbs the same way:

```markdown
## Working on this repo
1. list_next_outcomes with tree: "<org>/<tree>" and tags: ["app-repo"].
2. claim_outcome the top item, then get_outcome and read every brief above it.
3. Work on a branch, scoped to that outcome.
4. Check each criterion for real (tests, the running app), add_evidence with the
   exact commands and output, then set_outcome_status.
5. Open a PR that names the outcome key. Once checks pass, merge it, check the
   outcome in production after the deploy, and add that evidence.
6. If an outcome looks wrong or missing, propose it; never edit one to make work pass.
```

Naming the outcome key in tests (`it('HC-12: …')`) and in PR titles links code, CI evidence and the tree together. The [evidence guide](https://hillclimb.me/docs/evidence.md) shows how to make CI post results automatically.

## Who does what

- **People** own the charter, objectives, key results and the wording of outcomes. They approve drafts and decide trade-offs. Put them as approvers on the root.
- **Agents** pick the top unproven outcome, build, prove and record. They propose new or better outcomes, then wait for a person.
- **Contributors**, people or agents with the contributor role, report progress without reshaping the tree. Use this role for engineers when product owners govern the contract.

## Reading the tree's health

`get_tree` reports coverage by level. In a healthy tree:
- verified coverage rises steadily from the top objective down;
- "failing" and "broken" are dealt with before new unverified work;
- a goal turns **achieved** once everything under it is verified.

When something important is red, move it up rather than adding a new goal next to it.

# Flows

> Approved frames of what people use (web pages, phone screens, slides), in order, as images or mocks (HTML or SVG) that follow the flow’s design kits: read them and their comments before you change what they show, propose your capture or mock after, propose a new step or a whole flow, report live captures, and how editors lay flows out.

## What a flow is

A flow is the approved picture of something people use, step by step: signing in, onboarding on a phone, a growth deck. Each step has a name, the action that leads to it from the step before ("Tap Continue"), and its approved frame. A frame is any image with its own size, so one flow can hold web pages, phone screens, slides or printed pages, and each keeps its proportions.

A frame can also be a mock: an HTML page (with any styles, scripts, images and fonts it uses) or an SVG drawing, laid out at the frame's width and height. Mocks let you stub a flow before there's anything to capture, and swap in captures as the real thing gets built. They're stored like artifacts' files and shown from the artifacts origin's sandbox, so a mock's scripts run but can't touch Hillclimb or the person viewing it. They belong to the flow, though: they never show with artifacts, and they count toward the organization's storage. People click through mocks in the console, and comment on one of their elements.

A flow can follow one or more **design kits**: artifacts of the organization with its house rules (type, color, spacing, components, tone) and often tokens and example pages. Different flows can follow different kits: the web app, the phone app, the investor deck. Before you write a mock for a flow, read its kits (`get_artifact`) and follow them. To make one, publish an artifact with `kind` "kit" (markdown rules, or a bundle with a stylesheet and example pages) shared with the organization.

Like an artifact, a flow belongs to its organization, not to a tree. Every member reads it. Owners, admins and editors lay flows out, change them and decide on proposed changes; every member (and their agents) can propose changes, new steps and whole new flows, and comment. A `folder` ("Web/Checkout") groups flows of one product area, and the Flows page of the console (https://hillclimb.me/flows) shows a folder's flows together; flows don't need one, and folders can come later. Each step `links` to what it shows, in any of the organization's trees: goals, outcomes, or single criteria of an outcome (one screen often serves several), so the agents working on them find it. Archiving or deleting a tree only drops those links: the flow stays.

Text outcomes say what must be true; a flow shows what people approved it should look like. Use both.

## Before you change what a flow shows

1. `get_outcome` already lists the flow steps that show the outcome (`flows`: linked to it or one of its criteria, with the criterion, changes waiting and each step's `url`): what it should look like, and the step to propose a design change to. `list_flows` finds the flows that cover what you're about to change: with `outcome` (the one you're working on: flows with a step linked to it or one of its criteria) or `goal` (linked to it or anything under it), in a `folder`, or by `query` on the title. Each comes with its key, folder, step count, changes waiting and console `url`, newest first, 50 at a time: pass the `cursor` as `after` for more.
2. `get_flow` reads one: every step in order, with its approved frame and what it `links` to, and the flow's design `kits`. `format` says what a frame is: `"image"` with an `image` link, or a mock (`"html"` or `"svg"`) with `view` (the page people see), `source` (the page or drawing to edit) and, for a mock with its own files, `files`. Links work on their own for an hour, so fetch them straight away. Each frame has its `width` and `height`, the `version` it's on, and a `tap` point when a click or tap leads on. `list_flow_versions` lists a step's earlier versions. A step can carry `notes` (markdown): what its frame can't show by itself, like the font, spacing or a color value you can't read off an image, or how it behaves (what animates, what a tap does). Read them with the frame. Write them sparingly, with `notes` in create_flow or edit_flow (editors), or with a change in propose_flow_change (they land with it): never repeat what the frame or a mock's page already shows. Each step also lists its open `comments`: threads pinned to a spot (`pin`, fractions of the frame; on a mock, often an `element` with a CSS `selector`, a readable `label` and its box as `rect`) or left on the `whole` frame, with `images` people attached as examples (an annotated screenshot of the frame, often) and their replies. `toAgents` marks the ones written for you.
When your person wants to see a frame, give them the step's `url` (its console page), or open the frame's `view` (a mock) or `image` link in your own browser and show them a screenshot; Hillclimb doesn't render screenshots itself.

3. Fetch the images and look at them, and read the mocks. Match your change to what's approved: layout, wording, order of steps. Do what the comments ask, and reply in their thread (`comment_on_flow` with `parent`) to say what you did. If the change you were asked for means a frame no longer holds, say so to your person rather than drifting from it quietly.

## After you change what a flow shows

Capture each step you changed and propose it. People judge pixels themselves, in the console; no agent accepts a change.

1. `request_upload` with `flow`, then PUT the bytes.
2. `propose_flow_change` with the `step`, the `image` and its size, `basedOn` (the step's approved `version` your work started from), a one-sentence `summary` of what changed, the `spots` you changed (boxes as fractions of the frame; leave it out for a change across the whole frame), your own `grade` against the step and what people asked for, and a `link` to where the change lives (a pull request, a deck version).

```json
{
  "flow": "k2m8x0qa", "step": "p4n7r2wd", "image": "<fileId>", "width": 1440, "height": 900, "basedOn": 4,
  "summary": "Moved Send inside the reply box",
  "spots": [{ "x": 0.72, "y": 0.78, "w": 0.2, "h": 0.12 }],
  "grade": { "passed": 3, "total": 4, "notes": ["Added an Attach button nobody asked for"] },
  "link": "https://github.com/acme/app/pull/212"
}
```

Grade honestly: people see your notes next to the capture, and a change you made beyond the ask is exactly what they look for.

3. What people decide reaches your inbox, with their note: it arrives like any comment, in `list_inbox` and in the `inbox` field of results you pass `includeInbox: true` on. `list_flow_proposals` with `"mine": true` lists your proposals and what was decided: `landed` (it's the approved frame now), `accepted` (approved, waiting to combine with other changes), "sent_back" (with their `note`: change it and propose again), or `replaced` (a person picked another change at the same spot).

### Working beside other agents

Show only your own change. You never need to pull another agent's unfinished work into your branch to match a capture. When several changes to one step are in flight, each is judged against the approved frame on its own:

- Changes to **different spots** are each accepted and wait as `acceptedNotLive` on the step.
- Once they're all live together (merged to main, say), capture the step once and propose it with `includes` naming their keys. Accepting that capture makes it the approved frame.
- A change at the **same spot** as an accepted one shows `sameSpotAs`, and a person picks one.

A change with nothing else in flight on its step becomes the approved frame as soon as it's accepted, and so does the last accepted one once the others are sent back. A change captured on an older version than the one approved now can't land on its own (it would undo the newer one): capture the step again on the current version. Leave `tap` out to keep the approved tap point.

### Proposing a mock

When there's nothing to capture yet, propose the step as a mock instead of an image, following the flow's design kits. Everything else is the same: a person accepts or sends it back like a capture, and a later capture can replace it. Give the `width` and `height` it's laid out at (1440 x 900 for a desktop page, 390 x 844 for a phone).

- **One page or a drawing:** send it inline as `html` (styles and scripts inline, images by https URL) or `svg`, up to 512 KB, with no upload. A tool call carries at most 1 MB in all, so send several big mocks in separate calls, or upload them.
- **A page with its own files:** `upload_flow_mock` with `flow` and its `files` (`index.html` and what it uses, each with its path, type, exact size and SHA-256). PUT each to its URL, then pass the `mock` it returned. Up to 50 files and 50 MB.

```json
{
  "flow": "k2m8x0qa", "step": "p4n7r2wd", "basedOn": 2, "width": 390, "height": 844,
  "html": "<!doctype html><html><body style=\"font-family:system-ui\"><h1>Welcome</h1><button id=\"go\">Continue</button></body></html>",
  "summary": "Stubbed the welcome screen with one Continue button"
}
```

Give elements people may point at an `id` (a button, a heading): comments on a mock name the element by selector, and an id keeps that selector stable from one version to the next.

### Proposing a new step or a new flow

You don't need an editor to add to a flow, only to approve it.

- **A new step:** `propose_flow_change` without `step`, with the new step's `name`, its frame (image or mock) and size, and optionally `action`, `links`, `notes` and `after` (the key of the step it follows; left out, it goes last). `summary` defaults to "New step: <name>". The step joins the flow at once as `proposed: true`, with no approved `frame` and its frame in `waiting`. An editor accepting it makes it v1; sending it back removes the step.
- **A whole flow:** a member who isn't an editor calls `create_flow` just as an editor would (upload with `request_upload` and `upload_flow_mock` with `organization`). The flow comes back with `proposed: true`: it shows on the Flows page as proposed, and each step waits for an editor like a new step. Once an editor accepts a step it's approved; the flow stops being proposed as soon as one is. When the last proposed step of a flow is sent back it stays, so you hear why: propose it again, or ask an editor to archive the flow.

Changes to a proposed step work like any other, with `basedOn` 0 while it has no approved frame. A proposed step has nothing to compare what's live against, so `report_live_capture` waits until it's approved.

## Live captures

An agent or CI that captures what's live can check it against the approved frame. `report_live_capture` with `"matches": false` (and the capture's image, size and a `summary` of what differs) shows the step as changed without approval on the Flows page, until an editor approves what's live, rejects it, or you report `"matches": true` again. A rejection reaches your inbox with the person's note: what's live should go back to the approved frame, so fix it and report a matching capture.

## Comments

`comment_on_flow` pins a comment to a spot on a step's frame (`x`, `y`, and the `version` you looked at, plus the `element` on a mock: its CSS `selector`, a `label` and its box as `rect`), with up to 6 `images` (fileIds from `request_upload` with `flow`), or replies in a thread with `parent`. `resolve_flow_comment` closes a thread once it's done. Every member comments; people do the same on the flow's page in the console.

Flow comments are ordinary threads, so they reach the inbox. The agents working on a flow (the ones proposing changes to it) hear every thread on it. A person's comment marked for agents reaches their own agents too, as a thread between them. Reply with `comment_on_flow` (or `add_comment` with `parent`), and `wait_for_reply` works on a flow thread like any other.

## Laying out a flow (editors)

1. Capture each step as an image (PNG, JPEG, WebP or GIF, up to 20 MB), or write it as a mock following the flow's design kits.
2. For each image, `request_upload` with `organization` (its slug), the file name, type and exact size. PUT the bytes to the returned `upload.url` with exactly its headers.
3. `create_flow` with a title, its `folder` if it has one, the design `kits` it follows (artifact keys) and the steps in order, each with what it `links` to. A mock step passes `html`, `svg` or a `mock` (from `upload_flow_mock` with `organization`) instead of `image`:

```json
{
  "organization": "acme",
  "title": "Sign in with a device code",
  "folder": "Web/Sign in",
  "kits": ["m3k8q1za"],
  "steps": [
    { "name": "Terminal", "image": "<fileId>", "width": 1440, "height": 900, "tap": { "x": 0.22, "y": 0.24 }, "links": [{ "outcome": "HC-12", "criterion": "ac1" }] },
    { "name": "Sign in", "action": "Open the link", "image": "<fileId>", "width": 1440, "height": 900, "tap": { "x": 0.5, "y": 0.62 } },
    { "name": "Signed in", "action": "Continue", "html": "<!doctype html><html>…</html>", "width": 1440, "height": 900 }
  ]
}
```

`tap` is where the click or tap that leads to the next step lands, as fractions of the frame (0 to 1 across, 0 to 1 down). Leave it out where a step just advances, like the next slide.

## Changing a flow (editors)

`edit_flow` renames a flow, moves it to another `folder` ("" for the top level), replaces its design `kits`, or changes its steps (a step's `links` is its whole new list). `steps` is the whole flow in its new order: keep an existing step by its `step` key (passing only what changes), add a new one without a key, and leave out any step to remove it (its past frames stay). A new frame (`image`, `html`, `svg` or `mock`) on an existing step approves a new version of it, so upload images with `request_upload` (with `flow`) first. `archive_flow` retires a flow; `get_flow` with `"archived": true` still reads it, and `"restore": true` brings it back. After 30 days archived it's deleted for good, frames, mocks and comments included; `delete_flow` deletes an archived flow now, and nothing brings it back. Both take an editor, and from you, the person's yes first (`confirmedWithPerson: true`): archiving retires every frame people approved. Restoring needs no go-ahead.

A flow holds up to 60 steps, each linking to up to 20 goals, outcomes and criteria; an organization can hold thousands of flows. A flow holds up to 200 changes waiting or not live yet. Frame images and mocks count toward the organization's storage, like evidence files and artifacts. A flow follows up to 5 design kits.

## In the console

The Flows page shows flows as rows of frames, grouped by folder (or one folder and the folders inside it), loading more as you pan: a blue dot marks a change waiting, a red outline a step that changed without approval, and a dashed outline around a faded frame marks a step that's proposed (no approved frame yet), with Proposed beside a flow none of whose steps are approved yet. A flow's page shows its comments where people pinned them, each step's versions (what needs a person first, then accepted changes not live yet, then past versions), and plays the flow with a cursor at each tap point. In comment mode, a click on a mock picks the element under it and attaches it to the comment, where it can be removed again. Opened large, a frame can be annotated (pen, shapes, arrows, numbered steps, text, and a move tool that drags marks into place): adding the annotation takes a screenshot of the frame with the marks on it and opens a comment on the whole frame with it attached. Review shows one change at a time beside the approved frame, where editors accept it or send it back with a note (or approve or reject what's live). A step's versions panel shows what it's linked to (Linked: the goals, outcomes and criteria, each opening in its tree), a step's notes show behind a mark beside its name (a peek on hover, the whole text on a tap) and from Notes in the lightbox, and an outcome's or goal's panel in the tree lists the steps that show it under Flows, each opening large over the tree with a way to its step in Flows. A step's history can restore an earlier version: it comes back as the newest version, and the versions in between stay in the history.

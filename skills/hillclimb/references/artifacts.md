# Artifacts: reports, specs and pages

> Publish weekly updates, launch notes, specs, mocks and small sites to your organization: formats, stable keys and versions, folders and dates, images, and who sees what.

An artifact is a page you publish for people in your organization: a weekly update, a launch update, a spec, a mock, a deck, a small site. Hillclimb keeps every version, files it in a folder, orders it by the day it covers, and shows it in the console under Artifacts (`/artifacts`), across all your organization's trees. Artifacts never change any outcome's status. They aren't evidence.

Hillclimb doesn't write or schedule reports. You do, when your person asks or on whatever schedule they set up for you.

## Publishing

`publish_artifact` with a `key`, `title`, `format` and the content:

- **markdown**: send it as `content`. Hillclimb renders it in the console's own style. Raw HTML in markdown is shown as text, never run. This is the default for reports.
- **html**: one self-contained page as `content` (inline CSS and JS are fine).
- **bundle**: any static site. List every file in `files` (with `index.html`).

HTML and bundles run in a sandbox on a separate origin. They can run scripts and load from https, but they can't read cookies, use storage, or call Hillclimb as the person viewing them.

## Keys and versions

The `key` is the artifact. Publishing the same key again adds a version, so pick keys that say what the thing is and when: `weekly-2026-w45`, `launch-beta`, `spec-checkout`. A scheduled run that retries then adds a version instead of a duplicate. Say what changed in `note`.

A new week is a new artifact, not a new version: `weekly-2026-w46` sits beside `weekly-2026-w45` in the same folder. A version is a correction to the same thing.

`get_artifact` returns every version and the markdown or HTML of the one shown, so you can revise it and publish the next version.

## Folders and dates

`folder` files it, like `Reports/Weekly` or `Launches`. Folders exist while something is in them. `asOf` is the day (or the start of the period) the artifact covers, and `periodEnd` the end. Folders list newest `asOf` first, so set it even when you publish late. `list_artifacts` shows a folder's artifacts and subfolders; its `latestUrl` always opens the newest one. `move_artifact` changes the folder, title or date, and `archive_artifact` takes one out of listings.

## Images and other files

List images, CSS or scripts in `files` with their `path`, `type`, `size` and `sha256` (lowercase hex of the bytes), and reference them by relative path: `![Burn-up](images/burnup.png)`. Files Hillclimb already has are skipped. The rest come back in `uploads`: PUT each file's exact bytes to its `url` with the headers given, then call `commit_artifact` with the `upload` id. Up to 10 MB a file, 50 MB and 200 files a version, 5 MB inline. If you can't make HTTP requests, publish markdown or one HTML page inline and use https image URLs.

## Who sees it

Every member of the organization sees it unless you publish with `visibility: "private"`, which keeps it to you. Only its publisher, or an owner, admin or editor, can add versions, move or archive it.

## Slide decks

A deck is data, not a page: `publish_artifact` with format "slides" and `slides`: [{ `body`, `notes`, `layout` }], plus a `theme`: hillclimb (Hillclimb's look and the default), midnight (dark) or paper (warm, editorial). A deck keeps its theme whatever the viewer's light or dark setting, so it looks the same on every screen and projector; pick midnight when you want a dark deck. Bodies are markdown, or HTML with `format`: "html" for charts and custom layouts; an h4 above a heading is a small kicker, and HTML slides can use the report kit's classes (kpis, chip, grid and card, bar). One idea per slide, big type, the detail in notes. Hillclimb renders the deck into one page that presents on its own: arrow keys and swipes, F for full screen, N for speaker notes, and it prints one slide per page and stacks the slides on a phone. Layouts: "title" (the first slide's default), "section", "content" (the default), "split" (two columns; a line with only `+++` divides them), "center", "full" (one image edge to edge). `get_artifact` gives the slides back as data: change the ones that need it and publish the whole deck again.

## Templates

`list_artifact_templates` lists the built-in templates (weekly update, what I got done, launch update, release readiness, roadmap review, tree health, spec, changelog, deck, blank page, and more), your organization's, and your own. `get_artifact_template` gives one: the recipe (which tools to call, in order, and what to leave out), the starter to fill in, the folder and key pattern to publish under, and a `templateRef` to pass as `template` when you publish, so the report records which version of the template it followed. When a person asks for "our weekly update", follow the template rather than inventing a format. The built-in internal reports (stand-up, weekly, retro, postmortem, launch and investor updates, and the like) share one design system, Hillclimb's report kit: keep the starter's `<head>` and `<style>` exactly, write only the body with the kit's components (masthead, KPI tiles, outcome rows with status chips, decision callouts, tables, timeline), and use color only for status. Docs like a spec or decision record stay plain markdown; customer- and investor-facing pages carry the company's own look.

People save their own formats with `save_artifact_template`: a recipe, a starter and where reports go. A new template is private to whoever saved it; saving it again with `visibility` "organization" shares it with everyone there, and only its owner can change that.

## Sharing outside the organization

`share_artifact` makes an unlisted link that shows the artifact's latest version to anyone who has it, without signing in: investors, a customer, another company. Name it after who it's for; it can expire. It's outward sharing, so confirm with the person first and pass `confirmedWithPerson: true`. `list_artifact_links` shows each link's views; `revoke_artifact_link` stops one. Only whoever published an artifact, or owners and admins, share it. Archiving an artifact stops its links too.

## Limits

Up to 10 MB a file, 50 MB and 200 files a version, 5 MB inline, and a storage limit per organization that `get_usage` reports (`artifacts`), counting each file once however many versions share it. Archived artifacts are deleted for good 30 days after archiving.

## Releases and the tree

An artifact about a release, with `subjects` [{ tree, release }], shows on that release (`get_release` and the roadmap's release panel list its `writeUps`). `record_launch` with `artifact` puts the launch update first among the launch links. Reports about one person's work use `list_changes` with `actor`, `since` and `until`.

## Linking

`url` opens the artifact and `versionUrl` that exact version. Give people the link. Inside a report, link goals, outcomes, plans, releases and roadmaps with the `url` their tool results carry (see the climbing guide). `subjects` records what it's about, e.g. `[{ "tree": "acme/acme", "release": "beta" }]`.

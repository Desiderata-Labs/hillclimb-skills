#!/usr/bin/env node
// Posts test results to a Hillclimb inbound trigger as evidence: one event per outcome per run,
// with pass and fail counts and a link to the run. Names of passing tests are left out and failing
// ones are capped, so evidence stays a summary; the full log stays in CI, behind the link.
// Name the outcome a test covers in its title, e.g. it('HC-12: marks a verified outcome broken…').
//
//   npx vitest run --reporter=json --outputFile=test-results.json
//   HILLCLIMB_HOOK_URL=… node scripts/post-test-evidence.mjs test-results.json [run-url]
//
// HILLCLIMB_KEY_PREFIXES (e.g. "HC,HI") limits which key-shaped words count, so "UTF-8" or
// "SHA-256" in a test name is never taken for an outcome. Without it, any key-shaped word counts,
// and one that names no outcome in the tree is reported as skipped rather than failing the step.
//
// Works with any reporter that writes Jest-style JSON (vitest, jest): testResults[].assertionResults[].
// The trigger should map "conclusion" with {"success": "confirms", "failure": "denies"}.

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const KEY = /\b[A-Z][A-Z0-9]*-\d+\b/g
/** Failing test names listed per outcome; the rest are only counted. */
const MAX_FAILED_NAMES = 20

/** The outcome keys named in a test name, limited to the given prefixes when there are any. */
export function keysIn(name, prefixes = []) {
  const keys = new Set(name.match(KEY) ?? [])
  return [...keys].filter((key) => !prefixes.length || prefixes.includes(key.slice(0, key.indexOf('-'))))
}

const prefixesFrom = (value) =>
  (value ?? '').split(/[\s,]+/).map((p) => p.trim().toUpperCase()).filter(Boolean)

/** Groups a Jest-style report by the outcome keys in test names: one event per outcome. */
export function summarize(report, runUrl, prefixes = prefixesFrom(process.env.HILLCLIMB_KEY_PREFIXES)) {
  const byOutcome = new Map()
  for (const suite of report.testResults ?? []) {
    for (const test of suite.assertionResults ?? []) {
      const name = test.fullName ?? [...(test.ancestorTitles ?? []), test.title].join(' > ')
      for (const key of keysIn(name, prefixes)) {
        const entry = byOutcome.get(key) ?? { passed: 0, failed: [], skipped: 0 }
        if (test.status === 'passed') entry.passed++
        else if (test.status === 'failed') entry.failed.push(name)
        else entry.skipped++
        byOutcome.set(key, entry)
      }
    }
  }
  return [...byOutcome].map(([key, { passed, failed, skipped }]) => ({
    outcomes: [key],
    conclusion: failed.length ? 'failure' : 'success',
    title: (failed.length
      ? `${failed.length} failed, ${passed} passed: ${failed.slice(0, 3).join('; ')}`
      : `${passed} passed, 0 failed`
    ).slice(0, 480),
    url: runUrl,
    passed,
    failed: failed.length,
    skipped,
    failedTests: failed.slice(0, MAX_FAILED_NAMES),
  }))
}

/** The hook's answer when a key names no outcome it can find: worth a warning, not a failed step. */
export function isUnknownOutcome(status, body) {
  let message = body
  try {
    message = JSON.parse(body).error ?? body
  } catch {
    // Not JSON: match the raw text.
  }
  return status === 409 && /No outcome "[^"]+" that you can access/.test(message)
}

async function main() {
  const [file, runUrl = process.env.RUN_URL] = process.argv.slice(2)
  const hook = process.env.HILLCLIMB_HOOK_URL
  if (!file || !hook) {
    console.error('Usage: HILLCLIMB_HOOK_URL=<inbound trigger url> node scripts/post-test-evidence.mjs <results.json> [run-url]')
    process.exit(2)
  }
  const events = summarize(JSON.parse(readFileSync(file, 'utf8')), runUrl)
  if (!events.length) {
    console.log('No outcome keys found in test names; nothing posted.')
    return
  }
  let failures = 0
  for (const event of events) {
    const res = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) })
    const body = await res.text()
    if (!res.ok && isUnknownOutcome(res.status, body)) {
      console.log(`${event.outcomes[0]}: skipped, no such outcome in the tree (set HILLCLIMB_KEY_PREFIXES to ignore words like it)`)
      continue
    }
    console.log(`${event.outcomes[0]}: ${event.title.slice(0, 80)} → ${res.status} ${body.slice(0, 200)}`)
    if (!res.ok) failures++
  }
  process.exit(failures ? 1 : 0)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()

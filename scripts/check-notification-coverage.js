#!/usr/bin/env node
/*
 * Realtime notification coverage guard (dependency-free).
 *
 * Cross-checks the client's dispatch decision tables (src/state/notification-coverage.ts)
 * against the generated SignalR connector (src/dtos/sqe-signalr.ts):
 *
 *   - Every server broadcast (a connect<Event> in the generated connector) MUST
 *     have an explicit client decision — either a handler (HANDLED_EVENTS) or an
 *     intentional ignore (UNHANDLED_EVENTS). This is what stops a newly-added API
 *     event from silently going unhandled (the failure mode that hid the artefact
 *     mask bug — see docs/realtime-state-sync-audit-and-plan.md).
 *   - Every decision must correspond to a real generated event (catches typos and
 *     stale entries left behind when an event is removed from the API).
 *   - No event may appear in both tables.
 *
 * Exit code 0 on success, 1 on any drift. Runnable today with no extra deps:
 *   node scripts/check-notification-coverage.js   (or: npm run check:notifications)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const coveragePath = path.join(root, 'src/state/notification-coverage.ts');
const connectorPath = path.join(root, 'src/dtos/sqe-signalr.ts');

function fail(message, items) {
    console.error(`\n✗ notification coverage: ${message}`);
    if (items && items.length) {
        for (const it of items) {
            console.error(`    - ${it}`);
        }
    }
    console.error('\nSee docs/realtime-state-sync-audit-and-plan.md and update src/state/notification-coverage.ts.\n');
    process.exit(1);
}

function read(file) {
    if (!fs.existsSync(file)) {
        fail(`expected file not found: ${path.relative(root, file)}`);
    }
    return fs.readFileSync(file, 'utf8');
}

// Extract the `[ ... ]` value-array body of `export const <constName> ... = [ ... ];`.
// We anchor on the real declaration (not a mention in a comment) and on the
// assignment `=`, so a preceding type annotation like `ReadonlyArray<[string, ...]>`
// is not mistaken for the value array.
function arrayBody(source, constName) {
    const decl = source.indexOf(`export const ${constName}`);
    if (decl === -1) {
        fail(`could not find "export const ${constName}" in notification-coverage.ts`);
    }
    const eq = source.indexOf('=', decl);
    const open = source.indexOf('[', eq);
    const close = source.indexOf('];', open);
    if (eq === -1 || open === -1 || close === -1) {
        fail(`could not parse the array literal for ${constName}`);
    }
    return source.slice(open + 1, close);
}

// Strip // line comments so commented-out or explanatory text can't contribute
// false event names.
function stripLineComments(text) {
    return text.replace(/\/\/[^\n]*/g, '');
}

const coverageSrc = read(coveragePath);
const connectorSrc = read(connectorPath);

// HANDLED_EVENTS entries look like: ['EventName', 'handleEventName'],
// -> take the FIRST quoted token of each tuple.
const handledBody = stripLineComments(arrayBody(coverageSrc, 'HANDLED_EVENTS'));
const handled = [...handledBody.matchAll(/\[\s*'([^']+)'/g)].map((m) => m[1]);

// UNHANDLED_EVENTS entries are bare quoted strings: 'EventName',
const unhandledBody = stripLineComments(arrayBody(coverageSrc, 'UNHANDLED_EVENTS'));
const unhandled = [...unhandledBody.matchAll(/'([^']+)'/g)].map((m) => m[1]);

const uniq = (a) => [...new Set(a)];

// Generated broadcasts: every `connect<Event>(` in the connector. De-duplicated
// because the generated file also mentions method names in doc comments.
const generated = uniq([...connectorSrc.matchAll(/connect([A-Z]\w+)\s*\(/g)].map((m) => m[1]));
const handledSet = new Set(handled);
const unhandledSet = new Set(unhandled);
const dispatchedSet = new Set([...handled, ...unhandled]);
const generatedSet = new Set(generated);

// 1) Duplicates within a table.
const dupHandled = handled.filter((e, i) => handled.indexOf(e) !== i);
const dupUnhandled = unhandled.filter((e, i) => unhandled.indexOf(e) !== i);
if (dupHandled.length) fail('duplicate entries in HANDLED_EVENTS', uniq(dupHandled));
if (dupUnhandled.length) fail('duplicate entries in UNHANDLED_EVENTS', uniq(dupUnhandled));

// 2) An event may not be both handled and unhandled.
const overlap = handled.filter((e) => unhandledSet.has(e));
if (overlap.length) fail('events listed in BOTH HANDLED_EVENTS and UNHANDLED_EVENTS', overlap);

// 3) Every generated broadcast must have a decision.
const missing = generated.filter((e) => !dispatchedSet.has(e));
if (missing.length) {
    fail('server broadcasts with no client decision (add to HANDLED_EVENTS or UNHANDLED_EVENTS)', missing);
}

// 4) Every decision must correspond to a real generated broadcast.
const stale = [...dispatchedSet].filter((e) => !generatedSet.has(e));
if (stale.length) {
    fail('dispatch decisions for events that no longer exist in the generated connector (typo or removed API event)', stale);
}

console.log(
    `✓ notification coverage OK: ${generatedSet.size} broadcasts, ` +
    `${handledSet.size} handled, ${unhandledSet.size} intentionally unhandled.`,
);
process.exit(0);

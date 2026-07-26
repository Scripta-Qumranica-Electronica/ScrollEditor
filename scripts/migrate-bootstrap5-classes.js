#!/usr/bin/env node
/*
 * Bootstrap 4 -> 5 class codemod (dependency-free).
 *
 * Companion to check-bootstrap5-parity.js. Rewrites the mechanical, pure-rename
 * dead classes IN PLACE — but ONLY inside class / :class / static-class attribute
 * values, so a CSS `border-right:` property in a <style> block or a JS identifier
 * is never touched. Tokens inside :class expressions (object/array literals) are
 * handled because the rewrite is token-boundary based within the attribute string.
 *
 * Non-pure renames are intentionally NOT handled here (they need markup changes):
 *   - `close` -> `btn-close` (BS5 btn-close is a self-contained element, no &times;)
 *   - `custom-control/checkbox/radio/switch/file` -> `form-check*` (markup differs)
 * Fix those by hand; the scanner will keep flagging them until you do.
 *
 * Usage:
 *   node scripts/migrate-bootstrap5-classes.js           # dry run: report only
 *   node scripts/migrate-bootstrap5-classes.js --write    # apply
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const WRITE = process.argv.includes('--write');

// Pure token renames. Return the BS5 token, or null to leave unchanged.
function mapToken(t) {
    let m = t.match(/^m([rl])-((?:(?:sm|md|lg|xl)-)?(?:0|1|2|3|4|5|auto))$/);
    if (m) return 'm' + (m[1] === 'r' ? 'e' : 's') + '-' + m[2];
    m = t.match(/^p([rl])-((?:(?:sm|md|lg|xl)-)?(?:0|1|2|3|4|5))$/);
    if (m) return 'p' + (m[1] === 'r' ? 'e' : 's') + '-' + m[2];
    if (t === 'no-gutters') return 'g-0';
    m = t.match(/^font-weight-(bold|normal|light|bolder|lighter)$/);
    if (m) return 'fw-' + m[1];
    if (t === 'font-italic') return 'fst-italic';
    if (t === 'border-right') return 'border-end';
    if (t === 'border-left') return 'border-start';
    if (t === 'rounded-right') return 'rounded-end';
    if (t === 'rounded-left') return 'rounded-start';
    if (t === 'text-right') return 'text-end';
    if (t === 'text-left') return 'text-start';
    if (t === 'float-right') return 'float-end';
    if (t === 'float-left') return 'float-start';
    if (t === 'sr-only') return 'visually-hidden';
    if (t === 'sr-only-focusable') return 'visually-hidden-focusable';
    if (t === 'custom-select') return 'form-select';
    if (t === 'custom-range') return 'form-range';
    if (t === 'form-row') return 'row';
    return null;
}

// Rewrite dead tokens inside a class-attribute value string only.
function transformClassValue(value, counter) {
    return value.replace(/[A-Za-z][A-Za-z0-9-]*/g, (tok) => {
        const mapped = mapToken(tok);
        if (mapped && mapped !== tok) {
            counter.pairs.push(`${tok} → ${mapped}`);
            return mapped;
        }
        return tok;
    });
}

const attrRe = /((?::class|class|:?static-?class)\s*=\s*)("([^"]*)"|'([^']*)')/gi;

function walk(dir, out) {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) walk(full, out);
        else if (/\.(vue|ts)$/.test(name)) out.push(full);
    }
    return out;
}

let totalTokens = 0;
let filesChanged = 0;
const summary = new Map();

for (const file of walk(srcDir, [])) {
    const rel = path.relative(root, file);
    const src = fs.readFileSync(file, 'utf8');
    const counter = { pairs: [] };
    const next = src.replace(attrRe, (full, prefix, quoted) => {
        const q = quoted[0];
        const inner = quoted.slice(1, -1);
        const newInner = transformClassValue(inner, counter);
        return prefix + q + newInner + q;
    });
    if (counter.pairs.length) {
        filesChanged++;
        totalTokens += counter.pairs.length;
        console.log(`  ${rel}: ${counter.pairs.length} token(s)`);
        for (const p of counter.pairs) summary.set(p, (summary.get(p) || 0) + 1);
        if (WRITE) fs.writeFileSync(file, next);
    }
}

console.log(`\n${WRITE ? 'Applied' : 'Would apply'} ${totalTokens} rename(s) across ${filesChanged} file(s):`);
for (const [pair, n] of [...summary.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)} × ${pair}`);
}
if (!WRITE) console.log('\n(dry run — re-run with --write to apply)');

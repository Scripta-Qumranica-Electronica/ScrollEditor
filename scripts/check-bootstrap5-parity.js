#!/usr/bin/env node
/*
 * Bootstrap 4 -> 5 / bootstrap-vue -> bootstrap-vue-next parity guard (dependency-free).
 *
 * The Vue 2 -> 3 migration swapped Bootstrap 4 for Bootstrap 5 and bootstrap-vue
 * (v2) for bootstrap-vue-next. Both renamed or DROPPED a large set of class names
 * and component props. The dangerous part: the old names don't error — they are
 * simply unknown, so the class does nothing and the prop is ignored. The markup
 * looks correct, compiles clean, and silently renders wrong (a missing margin, a
 * dead border, a popover with no trigger). That is the exact failure mode behind
 * the "Adjust image" popover that never opened and the resize divider that bled
 * into the toolbar.
 *
 * This scanner enumerates every such dead token in src/ so the drift is a finite
 * checklist instead of something you find by clicking. For each hit it prints the
 * Bootstrap 5 / bootstrap-vue-next replacement.
 *
 * Exit 0 when clean, 1 when any dead token is found. Run:
 *   node scripts/check-bootstrap5-parity.js   (or: npm run check:bootstrap5)
 *
 * NOTE: intentionally NOT wired into pretest/CI yet — there is a known backlog
 * (run it to see the count). Once the backlog is migrated, add it to CI so a dead
 * BS4 class can never land again.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

// --- dead token -> { fix, why } -------------------------------------------------
// Each entry is a regex matched against class tokens (or, for props, raw markup).

// Bootstrap 4 utility classes renamed/removed in Bootstrap 5. These render nothing.
const DEAD_CLASS_RULES = [
    { re: /^m[rl]-(?:(?:sm|md|lg|xl)-)?(?:0|1|2|3|4|5|auto)$/, fix: 'mr-*→me-*, ml-*→ms-* (BS5 uses logical start/end)' },
    { re: /^p[rl]-(?:(?:sm|md|lg|xl)-)?(?:0|1|2|3|4|5)$/,      fix: 'pr-*→pe-*, pl-*→ps-* (BS5 logical start/end)' },
    { re: /^no-gutters$/,                                       fix: 'no-gutters → g-0' },
    { re: /^form-row$/,                                         fix: 'form-row → row + g-* (removed in BS5)' },
    { re: /^font-weight-(bold|normal|light|bolder|lighter)$/,  fix: 'font-weight-X → fw-X' },
    { re: /^font-italic$/,                                      fix: 'font-italic → fst-italic' },
    { re: /^border-(right|left)$/,                             fix: 'border-right→border-end, border-left→border-start' },
    { re: /^rounded-(right|left)$/,                            fix: 'rounded-right→rounded-end, rounded-left→rounded-start' },
    { re: /^text-(right|left)$/,                               fix: 'text-right→text-end, text-left→text-start' },
    { re: /^float-(right|left)$/,                              fix: 'float-right→float-end, float-left→float-start' },
    { re: /^custom-(select|range|control|checkbox|radio|switch|file)(-\w+)?$/, fix: 'custom-* form controls → BS5 form-* (form-select, form-range, form-check, ...)' },
    { re: /^sr-only(-focusable)?$/,                            fix: 'sr-only → visually-hidden' },
    { re: /^(badge-|btn-block$|close$)/,                       fix: 'BS4 badge-*/btn-block/close → BS5 (bg-*, d-grid, btn-close)' },
];

// bootstrap-vue (v2) component props/attrs dropped by bootstrap-vue-next. Matched
// against raw markup lines (not class tokens).
const DEAD_PROP_RULES = [
    { re: /\btriggers\s*=\s*"(?!")[^"]+"/, fix: 'b-popover/b-tooltip: v2 `triggers="click blur"` string is dead → use boolean trigger props (click/hover/manual) or v-model' },
];

// Vue-2 runtime APIs removed in Vue 3. Matched against raw (comment-stripped) lines,
// so commented-out remnants don't trip. `$root.$emit('bv::...')` is the bootstrap-vue
// v2 event bus (show/hide modals & popovers); Vue 3 removed `$root.$on`, so both the
// emit and any listener are dead — control the component via v-model/refs instead.
const DEAD_JS_RULES = [
    { re: /\$root\s*!?\s*\.\s*\$emit\s*\(\s*['"]bv::/, fix: "Vue-2 `$root.$emit('bv::...')` bus is dead → drive the <b-modal>/<b-popover> with a boolean v-model (see text-sign.vue / modal-bus.ts)" },
    { re: /\$root\s*!?\s*\.\s*\$(on|off|once)\s*\(/, fix: '`$root.$on/$off/$once` removed in Vue 3 → use a real event bus (mitt) or a store action' },
];

// bootstrap-vue directives are registered PER-COMPONENT in this app (createBootstrap
// does not globally register them — the app-level directive registry holds only i18n's
// `t`). So any v-b-<name> used in a template MUST be registered in that same file's
// `directives: { ... }`; otherwise Vue can't resolve it and it silently no-ops.
const BOOTSTRAP_DIRECTIVES = ['tooltip', 'toggle', 'modal', 'popover', 'visible', 'scrollspy'];

// -------------------------------------------------------------------------------

function walk(dir, out) {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            walk(full, out);
        } else if (/\.(vue|ts)$/.test(name)) {
            out.push(full);
        }
    }
    return out;
}

// Pull class tokens out of both static (class="...") and bound (:class / staticClass)
// contexts, so `class="mr-2 border-right"` and `:class="['ml-2']"` both get scanned.
function classTokensOnLine(line) {
    const tokens = [];
    const attrRe = /(?:^|\s)(?::class|class|:?static-?class)\s*=\s*("([^"]*)"|'([^']*)')/gi;
    let m;
    while ((m = attrRe.exec(line))) {
        const body = m[2] != null ? m[2] : m[3] || '';
        for (const t of body.split(/[\s'",[\]{}():]+/)) {
            if (t) tokens.push(t);
        }
    }
    return tokens;
}

const hits = [];

// Blank out the contents of comment blocks (<!-- -->, /* */) and line comments so
// our own explanatory comments — which necessarily name the dead APIs — don't
// self-trip the scanner. State is carried across lines for multi-line blocks.
function stripComments(lines) {
    let inHtml = false;
    let inBlock = false;
    return lines.map((line) => {
        let out = '';
        for (let i = 0; i < line.length; i++) {
            const two = line.slice(i, i + 2);
            if (inHtml) {
                if (line.slice(i, i + 3) === '-->') { inHtml = false; i += 2; }
                continue;
            }
            if (inBlock) {
                if (two === '*/') { inBlock = false; i += 1; }
                continue;
            }
            if (line.slice(i, i + 4) === '<!--') { inHtml = true; i += 3; continue; }
            if (two === '/*') { inBlock = true; i += 1; continue; }
            if (two === '//') break; // rest of line is a comment
            out += line[i];
        }
        return out;
    });
}

for (const file of walk(srcDir, [])) {
    const rel = path.relative(root, file);
    const lines = stripComments(fs.readFileSync(file, 'utf8').split('\n'));
    lines.forEach((line, i) => {
        for (const token of classTokensOnLine(line)) {
            for (const rule of DEAD_CLASS_RULES) {
                if (rule.re.test(token)) {
                    hits.push({ file: rel, line: i + 1, token, fix: rule.fix, kind: 'class' });
                }
            }
        }
        for (const rule of DEAD_PROP_RULES) {
            if (rule.re.test(line)) {
                hits.push({ file: rel, line: i + 1, token: line.trim().slice(0, 60), fix: rule.fix, kind: 'prop' });
            }
        }
        for (const rule of DEAD_JS_RULES) {
            if (rule.re.test(line)) {
                hits.push({ file: rel, line: i + 1, token: line.trim().slice(0, 60), fix: rule.fix, kind: 'js' });
            }
        }
    });

    // Per-file check: every v-b-<name> used must be registered in this file.
    const whole = lines.join('\n');
    for (const dir of BOOTSTRAP_DIRECTIVES) {
        // `v-b-toggle`, `v-b-toggle.arg`, `v-b-toggle="x"`, `:v-b-...` — match the bare directive.
        const useRe = new RegExp(`v-b-${dir}(?=[\\s.=>"']|$)`);
        if (!useRe.test(whole)) continue;
        // Registered if the file names it as a local directive key or imports its symbol.
        const cap = dir[0].toUpperCase() + dir.slice(1);
        const registered = new RegExp(`['"\`]b-${dir}['"\`]|vB${cap}\\b`).test(whole);
        if (!registered) {
            const idx = lines.findIndex((l) => useRe.test(l));
            hits.push({
                file: rel,
                line: idx + 1,
                token: `v-b-${dir}`,
                fix: `v-b-${dir} used but not registered in this component's directives:{} — add \`'b-${dir}': vB${cap}\` (import from bootstrap-vue-next). Directives are per-component here, not global.`,
                kind: 'directive',
            });
        }
    }
}

if (hits.length === 0) {
    console.log('✓ bootstrap5 parity: no dead Bootstrap-4 / bootstrap-vue-v2 tokens found.');
    process.exit(0);
}

// Group by fix category for a readable, actionable report.
const byFix = new Map();
for (const h of hits) {
    if (!byFix.has(h.fix)) byFix.set(h.fix, []);
    byFix.get(h.fix).push(h);
}

console.error(`\n✗ bootstrap5 parity: ${hits.length} dead token(s) that silently no-op under Bootstrap 5 / bootstrap-vue-next.\n`);
for (const [fix, group] of [...byFix.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.error(`  ${group.length.toString().padStart(3)} × ${fix}`);
    for (const h of group.slice(0, 8)) {
        console.error(`        ${h.file}:${h.line}  «${h.token}»`);
    }
    if (group.length > 8) console.error(`        … and ${group.length - 8} more`);
}
console.error(`\n  These are mechanical renames — see the fix hint on each group. Migrate, then wire`);
console.error(`  this script into CI (pretest) so a dead class can never regress the UI again.\n`);
process.exit(1);

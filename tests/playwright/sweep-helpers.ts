import type { Page } from '@playwright/test';

export interface SweepProblem {
    el: string;
    issue: 'zero-size' | 'overlapped' | 'clipped';
    detail: string;
}
export interface SweepResult {
    checked: number;
    problems: SweepProblem[];
}

// Runs IN THE BROWSER. Enumerates the interactive controls that are currently RENDERED +
// VISIBLE within `rootSelector` (default: whole document) and classifies layout problems:
//   - zero-size: a 0-width/height box,
//   - overlapped: the topmost element at the control's center is a DIFFERENT element (not
//     the control, an ancestor or a descendant) -> you can't click it,
//   - clipped: the control's box lies (almost) entirely outside its nearest scrollable
//     ancestor's client rect -> cut off / hidden by overflow.
// Controls whose CENTER is outside the viewport are skipped (virtualized/scrolled lists
// legitimately position rows off-screen, and elementFromPoint only works in the viewport).
function auditFn(rootSelector: string): SweepResult {
    const SEL = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [contenteditable="true"]';
    const root: ParentNode = rootSelector ? document.querySelector(rootSelector) || document : document;
    const describe = (el: Element) => {
        const e = el as HTMLElement;
        const txt = (e.getAttribute('title') || e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40);
        const cls = e.className && typeof e.className === 'string' ? '.' + e.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '';
        return `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${cls}${txt ? ` "${txt}"` : ''}`;
    };
    const scrollParent = (el: HTMLElement): HTMLElement => {
        let p = el.parentElement;
        while (p) {
            const o = getComputedStyle(p).overflow + getComputedStyle(p).overflowY + getComputedStyle(p).overflowX;
            if (/(auto|scroll|hidden)/.test(o)) return p;
            p = p.parentElement;
        }
        return document.documentElement;
    };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out: SweepProblem[] = [];
    let checked = 0;
    for (const el of Array.from(root.querySelectorAll(SEL))) {
        const e = el as HTMLElement;
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        if (!e.getClientRects().length) continue;
        if (cs.pointerEvents === 'none') continue;
        const r = e.getBoundingClientRect();
        checked++;
        if (r.width === 0 || r.height === 0) {
            out.push({ el: describe(e), issue: 'zero-size', detail: `${Math.round(r.width)}x${Math.round(r.height)}` });
            continue;
        }
        // Clipped by a scroll/overflow ancestor: the control's box barely intersects it.
        const sp = scrollParent(e);
        if (sp !== document.documentElement) {
            const pr = sp.getBoundingClientRect();
            const ix = Math.max(0, Math.min(r.right, pr.right) - Math.max(r.left, pr.left));
            const iy = Math.max(0, Math.min(r.bottom, pr.bottom) - Math.max(r.top, pr.top));
            if (ix * iy < r.width * r.height * 0.25) {
                out.push({ el: describe(e), issue: 'clipped', detail: `by ${describe(sp)}` });
                continue;
            }
        }
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue;
        const top = document.elementFromPoint(cx, cy);
        if (top && top !== e && !e.contains(top) && !top.contains(e)) {
            out.push({ el: describe(e), issue: 'overlapped', detail: `covered by ${describe(top)}` });
        }
    }
    return { checked, problems: out };
}

export async function auditControls(page: Page, rootSelector = ''): Promise<SweepResult> {
    return page.evaluate(auditFn, rootSelector);
}

// --- Data-leak / i18n scanner ---------------------------------------------------------------
// Runs IN THE BROWSER. Collects the VISIBLE text and flags generic "something rendered that a
// user should never see" — no per-page spec needed. Catches the class of bug where a raw object
// / array / undefined value / untranslated i18n key leaks into the UI (e.g. the copyright modal
// that printed `Collaborators [ { "email": ... } ]`).

export interface LeakFinding {
    kind: 'object' | 'json' | 'undefined' | 'nan' | 'i18n-key';
    match: string;
    context: string;
}

function scanFn(rootSelector: string): LeakFinding[] {
    const root: Element = (rootSelector ? document.querySelector(rootSelector) : document.body) || document.body;
    // Gather visible text only (skip script/style/hidden and off-DOM nodes).
    const parts: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const el = node.parentElement;
            if (!el) return NodeFilter.FILTER_REJECT;
            const tag = el.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
            if (!(node.textContent || '').trim()) return NodeFilter.FILTER_REJECT;
            // Also require the element to occupy layout (guards against display:contents wrappers).
            if (!el.getClientRects().length) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        },
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push((n.textContent || '').trim());
    // Also scan values sitting in inputs/textareas.
    for (const el of Array.from(root.querySelectorAll('input, textarea'))) {
        const v = (el as HTMLInputElement).value;
        if (v && v.trim()) parts.push(v.trim());
    }
    const text = parts.join('  •  ');

    const out: LeakFinding[] = [];
    const seen = new Set<string>();
    const push = (kind: LeakFinding['kind'], match: string, idx: number) => {
        const key = kind + '::' + match;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ kind, match, context: text.slice(Math.max(0, idx - 40), idx + match.length + 40) });
    };

    // A raw object stringified.
    for (const m of text.matchAll(/\[object [A-Z]\w+\]/g)) push('object', m[0], m.index!);
    // A JSON object/array leaked: an array-of-objects, or an object literal with a quoted key.
    for (const m of text.matchAll(/\[\s*\{|\{\s*"[\w-]+"\s*:\s*/g)) push('json', m[0].trim(), m.index!);
    // A standalone `undefined` / `NaN` token (not part of a longer identifier or a URL).
    for (const m of text.matchAll(/(?<![\w/.:@-])undefined(?![\w-])/g)) push('undefined', 'undefined', m.index!);
    for (const m of text.matchAll(/(?<![\w/.])NaN(?![\w-])/g)) push('nan', 'NaN', m.index!);
    // An untranslated i18n key that fell through to its dotted path (vue-i18n renders the key).
    for (const m of text.matchAll(/(?<![\w/@.])(error|home|misc|navbar|toasts)\.[a-z][A-Za-z0-9_.]+/g)) push('i18n-key', m[0], m.index!);

    return out;
}

export async function scanLeaks(page: Page, rootSelector = ''): Promise<LeakFinding[]> {
    return page.evaluate(scanFn, rootSelector);
}

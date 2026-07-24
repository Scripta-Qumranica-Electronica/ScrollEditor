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

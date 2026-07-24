import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

// Regressions for three bugs found by clicking around:
//  1. Copying an edition left the user where they were (router.push + router.go(0) raced,
//     reloading the OLD url) instead of opening the new edition.
//  2. The copy-edition modal showed a garbled "Copy RightHolder" label and dumped the raw
//     collaborators JSON array into the UI.
//  3. Creating an artefact on VERSO created it on RECTO (the side was never recorded at
//     creation, and the mask-save didn't carry the master image, so it defaulted to recto),
//     leaving the verso sidebar empty and the artefact unselectable.

// Edition 77 has imaged object IAA-648-1 with BOTH a recto and a verso side + copyright/shares.
const SOURCE_EDITION = 77;
const IMAGED_OBJECT = 'IAA-648-1';

let token: string;

test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    token = await loginToken(request);
    await request.dispose();
});

const authHeader = () => ({ Authorization: `Bearer ${token}` });

async function copyEdition(ctx: BrowserContext, name: string): Promise<number> {
    const r = await ctx.request.post(`${API}/v1/editions/${SOURCE_EDITION}`, { headers: authHeader(), data: { name } });
    // The copy response has unescaped control chars; pull the id out by regex, not JSON.
    const id = Number(((await r.text()).match(/"id":\s*(\d+)/) || [])[1]);
    expect(Number.isFinite(id), 'edition copy must yield a numeric id').toBeTruthy();
    return id;
}

// Open the copy-edition modal via its toolbox handler (the trigger is a button OR a dropdown
// depending on how many variant editions exist — calling the method is robust to both).
async function openCopyEditionModal(page: Page): Promise<void> {
    const ok = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const root: any = (document.getElementById('app') as any)?.__vue_app__?._instance;
        let target: any = null;
        const seen = new Set<any>();
        const visitInst = (inst: any) => {
            if (!inst || target || seen.has(inst)) return;
            seen.add(inst);
            if (inst.ctx && typeof inst.ctx.openCopyEdtion === 'function') {
                target = inst.ctx;
                return;
            }
            visitVnode(inst.subTree);
        };
        const visitVnode = (v: any) => {
            if (!v || target) return;
            if (v.component) visitInst(v.component);
            const ch = v.children;
            if (Array.isArray(ch)) ch.forEach(visitVnode);
        };
        visitInst(root);
        if (!target) return false;
        target.openCopyEdtion();
        return true;
    });
    expect(ok, 'found the copy-edition toolbox').toBe(true);
    await expect(page.locator('#copy-edition-modal .modal-content')).toBeVisible({ timeout: 10_000 });
}

function artefactSides(page: Page, name: string): Promise<string[]> {
    return page.evaluate((n) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = (document.getElementById('app') as any).__vue_app__.config.globalProperties.$state;
        return (st.imagedObjects.current?.artefacts ?? [])
            .filter((a: { name: string }) => a.name === n)
            .map((a: { side: string }) => a.side) as string[];
    }, name);
}

test('copy-edition modal shows a clean copyright + collaborator list (no raw JSON)', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await copyEdition(context, `pw-copydisplay-${Date.now()}`);
    const page = await context.newPage();
    await page.goto(`/editions/${ed}/imaged-objects/${IMAGED_OBJECT}`);
    await expect(page.getByRole('button', { name: 'New Artefact' })).toBeVisible({ timeout: 30_000 });

    await openCopyEditionModal(page);
    const text = (await page.locator('#copy-edition-modal .modal-content').innerText()).replace(/\s+/g, ' ');

    // Bug 2a: the garbled label is gone.
    expect(text).not.toContain('Copy RightHolder');
    // Bug 2b: no raw collaborators JSON leaked into the UI.
    expect(text).not.toMatch(/\[\s*\{/);
    expect(text).not.toContain('"permissions"');
    expect(text).not.toContain('mayWrite');
    // The collaborator is shown as a plain email under a Collaborators label.
    expect(text).toContain('Collaborators');
    expect(text).toContain('test@1.com');

    await collectCoverage(context);
    await context.close();
});

test('copying from an imaged-object view opens that same view on the NEW edition', async ({ browser }) => {
    const context = await authedContext(browser, token);
    const ed = await copyEdition(context, `pw-copynav-src-${Date.now()}`);
    const page = await context.newPage();
    await page.goto(`/editions/${ed}/imaged-objects/${IMAGED_OBJECT}`);
    await expect(page.getByRole('button', { name: 'New Artefact' })).toBeVisible({ timeout: 30_000 });

    await openCopyEditionModal(page);
    await page.fill('#newCopyName', `pw-copynav-${Date.now()}`);
    await page.locator('#copy-edition-modal').getByRole('button', { name: /copy edition/i }).first().click();

    // Bug 1: we must land on the SAME imaged-object view of a DIFFERENT (new) edition — not
    // stay on the old one (which is what router.go(0) racing router.push produced). The source
    // URL already matches the imaged-object pattern, so wait for the edition id to actually
    // CHANGE, not merely for the pattern.
    await page.waitForURL(
        (url) => {
            const m = new URL(url).pathname.match(new RegExp(`/editions/(\\d+)/imaged-objects/${IMAGED_OBJECT}`));
            return !!m && Number(m[1]) !== ed;
        },
        { timeout: 30_000 }
    );
    const newEd = Number(page.url().match(/\/editions\/(\d+)\//)![1]);
    expect(newEd).not.toBe(ed);

    await collectCoverage(context);
    await context.close();
});

test('creating an artefact on VERSO keeps it on verso, selected — not vanished to recto', async ({ browser }) => {
    // The user-facing symptom: after switching to verso and creating an artefact, it appeared
    // on RECTO and the verso sidebar was left empty with nothing selected + no editing ability.
    const context = await authedContext(browser, token);
    const ed = await copyEdition(context, `pw-verso-${Date.now()}`);
    const page = await context.newPage();
    await page.goto(`/editions/${ed}/imaged-objects/${IMAGED_OBJECT}`);
    await expect(page.getByRole('button', { name: 'New Artefact' })).toBeVisible({ timeout: 30_000 });

    // Switch the Side filter to Verso (the toggle shows the current side; the menu lists both).
    await page.getByRole('button', { name: /^Recto$/ }).first().click();
    await page.locator('.dropdown-item', { hasText: /Verso/ }).first().click();
    await expect(page.getByRole('button', { name: /^Verso$/ }).first()).toBeVisible({ timeout: 10_000 });

    // Create an artefact while on verso.
    const name = `pw-versoArt-${Date.now()}`;
    await page.getByRole('button', { name: 'New Artefact' }).click();
    await expect(page.locator('#newName')).toBeVisible({ timeout: 10_000 });
    await page.fill('#newName', name);
    await page.locator('#newModal').getByRole('button', { name: /create/i }).click();

    // It exists exactly once and on VERSO (before the fix the server returned recto, so it
    // vanished from the verso list).
    await expect.poll(() => artefactSides(page, name), { timeout: 15_000 }).toEqual(['verso']);

    // …and it is the SELECTED artefact — the editor isn't left with nothing selected / no
    // editing ability. The sidebar only renders the CURRENT side's artefacts, so a selected row
    // here (while on verso) is proof the new verso artefact is both listed and selected.
    await expect(page.locator('#imaged-object-artefacts .selectedRow')).toHaveCount(1, { timeout: 10_000 });

    await collectCoverage(context);
    await context.close();
});

test('the first mask write records an artefact’s side from its master image (verso persists)', async ({ browser }) => {
    // Backend guard for the same bug at the data layer: a new artefact is created without a mask,
    // so the server can't yet know its side (it comes back recto). The FIRST mask write must carry
    // the master image so the side is recorded from it — otherwise every mask-less artefact
    // silently becomes recto. Driven at the API so it's independent of canvas-drawing timing.
    const context = await authedContext(browser, token);
    const ed = await copyEdition(context, `pw-versoapi-${Date.now()}`);
    const io = await (await context.request.get(`${API}/v1/editions/${ed}/imaged-objects/${IMAGED_OBJECT}`, { headers: authHeader() })).json();
    const versoMaster = (io.verso?.images ?? []).find((im: { master: boolean }) => im.master)?.id as number;
    expect(versoMaster, 'imaged object has a verso master image').toBeTruthy();

    // Create with the verso master image but NO mask -> side not yet known (recto).
    const created = await (await context.request.post(`${API}/v1/editions/${ed}/artefacts`, {
        headers: authHeader(),
        data: { masterImageId: versoMaster, name: 'pw-api-verso', placement: { scale: 1, rotate: 0, translate: { x: 0, y: 0 }, zIndex: 0 } },
    })).json();
    expect(created.side).toBe('recto');

    // Write the first mask WITH the master image -> the side must now be recorded as verso.
    const put = await (await context.request.put(`${API}/v1/editions/${ed}/artefacts/${created.id}`, {
        headers: authHeader(),
        data: { mask: 'POLYGON((100 100,100 300,300 300,300 100,100 100))', masterImageId: versoMaster, name: 'pw-api-verso', placement: { scale: 1, rotate: 0, translate: { x: 0, y: 0 }, zIndex: 0 } },
    })).json();
    expect(put.side, 'side is derived from the master image on first mask write').toBe('verso');

    // And it is persisted (re-fetch).
    const refetched = await (await context.request.get(`${API}/v1/editions/${ed}/artefacts/${created.id}`, { headers: authHeader() })).json();
    expect(refetched.side).toBe('verso');

    await context.close();
});

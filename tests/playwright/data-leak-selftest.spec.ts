import { test, expect } from './fixtures';
import { scanLeaks } from './sweep-helpers';

test('scanLeaks detects each leak class (and ignores legit text)', async ({ browser }) => {
    const page = await (await browser.newContext()).newPage();
    await page.setContent(`
        <div id="root">
            <p>Copyright © 2026 test@1.com. Visit https://x.io/home.foo for details.</p>
            <p>Collaborators [ { "email": "a@b.com", "permissions": { "mayWrite": true } } ]</p>
            <p>Owner: [object Object]</p>
            <p>Pages: undefined</p>
            <p>Score: NaN</p>
            <p>navbar.login</p>
            <p>e.g. use 3Q4 and IAA-648-1</p>
        </div>`);
    const kinds = (await scanLeaks(page, '#root')).map((f) => f.kind).sort();
    // must catch json, object, undefined, nan, i18n-key
    for (const k of ['object', 'json', 'undefined', 'nan', 'i18n-key']) {
        expect(kinds, `should flag ${k}`).toContain(k);
    }
    // must NOT flag the legit copyright/email/URL/"e.g." text as a leak
    const findings = await scanLeaks(page, '#root');
    expect(findings.some((f) => f.match.includes('home.foo')), 'URL path is not an i18n key').toBe(false);
});

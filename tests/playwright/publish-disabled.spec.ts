import { test, expect, loginToken, authedContext, collectCoverage, API } from './fixtures';

// Publishing is a PLANNED feature that is intentionally NOT enabled yet. This guard locks in that
// state: on a draft edition the Publish control is present but DISABLED. If publishing is ever
// wired up, this test fails on purpose — a deliberate signal to update it alongside the feature.

test('the Publish control is present but disabled (feature intentionally dormant)', async ({ browser }) => {
    const context = await authedContext(browser, await loginToken(await browser.newContext().then((c) => c.request)));
    const token = await loginToken(context.request);
    const ed = Number(((await (await context.request.post(`${API}/v1/editions/899`, { headers: { Authorization: `Bearer ${token}` }, data: { name: `pw-publish-${Date.now()}` } })).text()).match(/"id":\s*(\d+)/) || [])[1]);

    const page = await context.newPage();
    await page.route('**/*', (r) => (r.request().resourceType() === 'image' ? r.abort() : r.continue()));
    await page.goto(`/editions/${ed}`);

    const publish = page.getByRole('button', { name: /Publish/ });
    await expect(publish, 'Publish button should render on a draft edition').toBeVisible({ timeout: 30_000 });
    await expect(publish, 'Publish must stay disabled until the feature is enabled').toBeDisabled();

    await collectCoverage(context);
    await context.close();
});

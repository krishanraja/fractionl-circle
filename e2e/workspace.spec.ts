import { expect, test, type Page, type TestInfo } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function signIn(page: Page) {
  await page.goto('/');
  const workspace = page.locator('.circle-workspace');
  const welcomeSignIn = page.getByRole('button', { name: 'Sign in' });
  await expect(workspace.or(welcomeSignIn)).toBeVisible();
  if (await workspace.isVisible()) return;
  if (!email || !password) throw new Error('E2E_EMAIL and E2E_PASSWORD are required for signed-in tests.');

  await welcomeSignIn.click();
  await expect(page.getByLabel('Email')).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(workspace).toBeVisible();
}

async function assertNoLayoutLeaks(page: Page) {
  const leaks = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const style = getComputedStyle(el);
        if (style.position === 'fixed' || style.display === 'none') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -2 || rect.right > viewport + 2);
      })
      .slice(0, 10)
      .map((el) => ({ tag: el.tagName, className: el.className, text: el.innerText?.slice(0, 40) }));
    return { pageWidth: document.documentElement.scrollWidth, viewport, offenders };
  });
  expect(leaks.pageWidth, JSON.stringify(leaks.offenders)).toBeLessThanOrEqual(leaks.viewport + 2);
}

async function attachScreen(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
}

test('the restored app keeps People, Ideas, and You one tap away', async ({ page }, testInfo) => {
  await signIn(page);
  const brand = page.locator('.circle-workspace .circle-brand:visible').first();
  await expect(brand).toHaveAttribute('aria-label', 'Circle by Fractionl');
  await expect(brand.locator('.circle-brand-parent-icon')).toBeVisible();
  await expect(page.getByText('Tell Circle what you need')).toBeVisible();
  await expect(page.getByRole('button', { name: /Add one person/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Bring in contacts/i })).toBeVisible();
  await assertNoLayoutLeaks(page);
  await attachScreen(page, testInfo, 'people');

  await page.getByRole('button', { name: /Add one person/i }).click();
  await expect(page.getByText('Use whatever you have: a name, photo, link, or voice note.')).toBeVisible();
  await expect(page.getByRole('radio', { name: /Screenshot or photo/i })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Just say their name/i })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Ideas', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Ideas', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start a new idea/i })).toBeVisible();
  await assertNoLayoutLeaks(page);
  await attachScreen(page, testInfo, 'ideas');

  await page.getByRole('button', { name: /Start a new idea/i }).click();
  await expect(page.getByRole('button', { name: '← All ideas' })).toBeVisible();
  await expect(page.getByText('What do you want to offer, and who to?')).toBeVisible();
  await page.getByRole('button', { name: '← All ideas' }).click();

  await page.getByRole('button', { name: 'You', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'You', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Edit profile/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Connected contacts/i })).toBeVisible();
  await assertNoLayoutLeaks(page);
  await attachScreen(page, testInfo, 'you');
});

test('a person started on the front door returns after sign-in without auto-saving', async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('circle.pendingClue', 'Maya Chen from HealthTech North'));
  await signIn(page);

  await expect(page.getByText('Add someone', { exact: true }).first()).toBeVisible();
  await expect(page.locator('textarea').filter({ hasText: '' })).toHaveValue('Maya Chen from HealthTech North');
  await expect(page.getByRole('button', { name: 'Find this person' })).toBeVisible();
  expect(await page.evaluate(() => window.sessionStorage.getItem('circle.pendingClue'))).toBe('Maya Chen from HealthTech North');
});

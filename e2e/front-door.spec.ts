import { expect, test } from '@playwright/test';

test('the front door explains Circle without product jargon or layout leaks', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Circle by Fractionl | Remember anyone. Find the right person later.');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Add a name, photo, link, or voice note. Circle keeps the details together and brings back the right person when they can help.');
  await expect(page.locator('link[href*="fonts."]')).toHaveCount(0);
  const brand = page.locator('.circle-auth-header .circle-brand');
  await expect(brand).toHaveAttribute('aria-label', 'Circle by Fractionl');
  await expect(brand.locator('.circle-brand-wordmark')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Remember anyone. Find the right person later.' })).toBeVisible();
  await expect(page.getByText('Add a name, photo, link, or voice note.')).toHaveCount(1);
  await expect(page.getByText('You add someone')).toBeVisible();
  await expect(page.getByText('Circle brings her back')).toBeVisible();

  const visibleCopy = await page.locator('body').innerText();
  expect(visibleCopy.toLowerCase()).not.toContain('clue');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth + 2),
  );

  await page.getByRole('button', { name: 'Keep this person close' }).click();
  await expect(page.getByText('Add one person first. A name is enough.')).toBeVisible();
  await expect(page.getByLabel('What do you remember about them?')).toBeFocused();

  const frontDoorScreenshot = testInfo.outputPath('front-door.png');
  await page.screenshot({ fullPage: true, path: frontDoorScreenshot });
  await testInfo.attach('front-door', { path: frontDoorScreenshot, contentType: 'image/png' });

  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  const accountBrand = page.locator('.circle-auth-header .circle-brand:visible');
  await expect(accountBrand).toHaveAttribute('aria-label', 'Circle by Fractionl');
  await expect(accountBrand.locator('.circle-brand-wordmark')).toBeVisible();
  const accountScreenshot = testInfo.outputPath('account.png');
  await page.screenshot({ fullPage: true, path: accountScreenshot });
  await testInfo.attach('account', { path: accountScreenshot, contentType: 'image/png' });
});

/**
 * Quick link/routing smoke test for production.
 * Usage: AUDIT_EMAIL=... AUDIT_PASSWORD=... node scripts/browser-audit-links.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.AUDIT_BASE_URL || 'https://circle.fractionl.ai';
const EMAIL = process.env.AUDIT_EMAIL;
const PASSWORD = process.env.AUDIT_PASSWORD;

async function signIn(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => page.goto(BASE));
  const signInLink = page.getByRole('button', { name: /^sign in$/i });
  if (await signInLink.isVisible().catch(() => false)) {
    await signInLink.click();
  }
  await page.getByPlaceholder(/you@company|email/i).first().fill(EMAIL);
  const pw = page.locator('input[type="password"]').first();
  await pw.fill(PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).last().click();
  await page.waitForSelector('text=Today', { timeout: 20000 }).catch(() =>
    page.waitForSelector('aside', { timeout: 5000 })
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const results = [];

  // 1. /privacy while signed out → sign-in prompt, not auth welcome only
  await page.goto(`${BASE}/privacy`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const privacySignedOut =
    (await page.getByText(/privacy & data settings/i).count()) > 0 &&
    (await page.getByRole('link', { name: /sign in to circle/i }).count()) > 0;
  results.push({ test: 'privacy signed out', ok: privacySignedOut, url: page.url() });

  // 2. /terms while signed out
  await page.goto(`${BASE}/terms`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const termsOk = (await page.getByText(/terms of use/i).count()) > 0;
  results.push({ test: 'terms signed out', ok: termsOk, url: page.url() });

  if (EMAIL && PASSWORD) {
    try {
      await signIn(page);
      const signedIn = (await page.locator('aside').count()) > 0;
      results.push({ test: 'sign in', ok: signedIn });

      if (signedIn) {
        const profileBtn = page.locator('aside .border-t button').first();
        await profileBtn.click({ timeout: 10000 });
        await page.getByRole('link', { name: /privacy settings/i }).click();
        await page.waitForURL(/\/privacy/, { timeout: 10000 });
        const privacyAuthed =
          (await page.getByText(/data processing preferences/i).count()) > 0;
        results.push({ test: 'profile privacy link', ok: privacyAuthed, url: page.url() });

        await page.getByRole('link', { name: /^back$/i }).click();
        await page.waitForTimeout(1500);
        const homeOk = !page.url().includes('/privacy');
        results.push({ test: 'privacy back to home', ok: homeOk, url: page.url() });
      }
    } catch (e) {
      results.push({ test: 'authed flow', ok: false, error: String(e) });
    }
  } else {
    results.push({ test: 'authed checks', ok: false, skipped: 'no AUDIT_EMAIL/PASSWORD' });
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  const failed = results.filter((r) => r.ok === false && !r.skipped);
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});

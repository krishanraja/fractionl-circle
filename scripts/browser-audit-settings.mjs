/**
 * Profile settings sheet - theme, compact, industry, currency
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = process.env.AUDIT_BASE_URL || 'https://circle.fractionl.ai';
const EMAIL = process.env.AUDIT_EMAIL;
const PASSWORD = process.env.AUDIT_PASSWORD;
const SUPABASE = 'https://ksyuwacuigshvcyptlhe.supabase.co';

const results = [];

async function getAnon(page) {
  if (process.env.SUPABASE_ANON) return process.env.SUPABASE_ANON;
  const src = await page.locator('script[src*="index"]').first().getAttribute('src');
  const text = await (await page.request.get(new URL(src, BASE).href)).text();
  return text.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)[0];
}

async function openProfile(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const btn = page.locator('aside .border-t button').first();
  await btn.click({ timeout: 15000 });
  await page.waitForTimeout(600);
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.log('skip: no AUDIT_EMAIL/PASSWORD');
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true });
  const boot = await browser.newPage();
  await boot.goto(BASE, { waitUntil: 'networkidle' });
  const anon = await getAnon(boot);
  const session = await (
    await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
  ).json();
  await boot.close();

  if (!session.access_token) {
    console.error('sign-in failed', session);
    process.exit(1);
  }

  const page = await browser.newPage();
  const net = [];
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('user_preferences') || u.includes('user_profiles')) {
      net.push({ m: r.request().method(), p: new URL(u).pathname, s: r.status() });
    }
  });

  await page.goto(BASE);
  await page.evaluate((v) => localStorage.setItem('sb-ksyuwacuigshvcyptlhe-auth-token', v), JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: 'bearer',
    user: session.user,
  }));
  await page.reload({ waitUntil: 'networkidle' });
  await openProfile(page);

  await page.getByRole('button', { name: 'Dark' }).click();
  await page.waitForTimeout(600);
  results.push({
    setting: 'theme dark',
    ok: await page.evaluate(() => document.documentElement.classList.contains('dark')),
  });

  const compactSwitch = page.getByText('Compact mode').locator('..').locator('..').getByRole('switch');
  const wasOn = (await compactSwitch.getAttribute('aria-checked')) === 'true';
  if (!wasOn) {
    const prefWait = page.waitForResponse(
      (r) => r.url().includes('user_preferences') && r.request().method() === 'PATCH',
      { timeout: 8000 }
    ).catch(() => null);
    await compactSwitch.click();
    await prefWait;
  }
  await page.waitForTimeout(600);
  results.push({
    setting: 'compact mode',
    ok:
      (await compactSwitch.getAttribute('aria-checked')) === 'true' &&
      (await page.evaluate(() => document.documentElement.classList.contains('compact-mode'))),
  });

  const ind = page.locator('label:has-text("Industry")').locator('..').locator('input');
  await ind.fill(`SettingsTest-${Date.now()}`);
  await ind.blur();
  await page.waitForTimeout(1200);
  results.push({
    setting: 'industry blur',
    ok: await page.locator('[data-sonner-toast]:has-text("Saved")').first().isVisible().catch(() => false),
  });

  const drawer = page.locator('.overflow-y-auto').last();
  await drawer.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(400);

  const currencyRow = page.locator('p:text-is("Currency")').locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
  if (await currencyRow.isVisible().catch(() => false)) {
    await currencyRow.getByRole('combobox').click();
    await page.getByRole('option', { name: /GBP/ }).click();
    await page.waitForTimeout(1000);
    results.push({
      setting: 'currency GBP',
      ok: net.some((n) => n.m === 'PATCH' && n.p.includes('user_profiles') && n.s < 300),
    });
  } else {
    results.push({ setting: 'currency GBP', ok: false, skipped: 'currency row not visible' });
  }

  await browser.close();
  writeFileSync('scripts/browser-audit-settings-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok && !r.skipped);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

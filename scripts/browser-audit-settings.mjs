/**
 * Profile settings sheet — all toggles and fields
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'https://circle.fractionl.ai';
const EMAIL = process.env.AUDIT_EMAIL;
const PASSWORD = process.env.AUDIT_PASSWORD;
const SUPABASE = 'https://ksyuwacuigshvcyptlhe.supabase.co';

const results = [];

async function main() {
  const anon = process.env.SUPABASE_ANON;
  const session = await (
    await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
  ).json();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
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
  await page.locator('aside').getByRole('button', { name: /krish/i }).click();
  await page.waitForTimeout(800);

  const net = [];
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('user_preferences') || u.includes('user_profiles')) {
      net.push({ m: r.request().method(), p: new URL(u).pathname, s: r.status() });
    }
  });

  // Theme dark
  await page.getByRole('button', { name: 'Dark' }).click();
  await page.waitForTimeout(800);
  const darkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  results.push({ setting: 'theme dark', ok: darkClass, net: net.slice(-1) });

  // Compact mode
  const compact = page.getByRole('switch').nth(0); // first switch in appearance - might be wrong index
  // Find by label
  const compactRow = page.locator('text=Compact mode').locator('..').locator('..').getByRole('switch');
  await compactRow.click();
  await page.waitForTimeout(500);
  const compactClass = await page.evaluate(() => document.documentElement.classList.contains('compact-mode'));
  results.push({ setting: 'compact mode', ok: compactClass });

  // Industry
  const ind = page.locator('label:has-text("Industry")').locator('..').locator('input');
  await ind.fill(`SettingsTest-${Date.now()}`);
  await ind.blur();
  await page.waitForTimeout(1200);
  const savedToast = await page.locator('[data-sonner-toast]:has-text("Saved")').first().isVisible().catch(() => false);
  results.push({ setting: 'industry blur', ok: savedToast, net: net.filter((n) => n.p.includes('user_profiles')).slice(-2) });

  // Currency
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'GBP' }).click();
  await page.waitForTimeout(1000);
  results.push({ setting: 'currency GBP', ok: net.some((n) => n.m === 'PATCH' && n.s < 300) });

  await browser.close();
  writeFileSync('scripts/browser-audit-settings-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

main();

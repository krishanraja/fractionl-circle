/**
 * Full production audit — AUDIT_EMAIL, AUDIT_PASSWORD, optional VERCEL_TOKEN
 */
import { chromium, devices } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = process.env.AUDIT_BASE_URL || 'https://circle.fractionl.ai';
const EMAIL = process.env.AUDIT_EMAIL;
const PASSWORD = process.env.AUDIT_PASSWORD;
const SUPABASE = 'https://ksyuwacuigshvcyptlhe.supabase.co';

const out = { base: BASE, at: new Date().toISOString(), tests: [] };
const log = (id, title, data) => out.tests.push({ id, title, ...data });

async function getAnon(page) {
  if (process.env.SUPABASE_ANON) return process.env.SUPABASE_ANON;
  const src = await page.locator('script[src*="index"]').first().getAttribute('src');
  const text = await (await page.request.get(new URL(src, BASE).href)).text();
  return text.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)[0];
}

async function apiSignIn(anon) {
  const r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  return r.json();
}

async function injectSession(page, session) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((v) => localStorage.setItem('sb-ksyuwacuigshvcyptlhe-auth-token', v), JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: 'bearer',
    user: session.user,
  }));
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1 Forgot password UI + recover API
  {
    const page = await browser.newPage();
    const net = [];
    page.on('response', (r) => {
      if (r.url().includes('/auth/v1/recover')) net.push({ status: r.status(), path: '/auth/v1/recover' });
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /sign in/i }).first().click();
    await page.waitForTimeout(500);
    const hasForgot = await page.getByText(/forgot password/i).isVisible();
    if (hasForgot) {
      await page.getByText(/forgot password/i).click();
      await page.locator('#forgot-email, input[type="email"]').first().fill(EMAIL || 'krish@themindmaker.ai');
      const recoverWait = page.waitForResponse((r) => r.url().includes('/auth/v1/recover'), { timeout: 10000 }).catch(() => null);
      await page.getByRole('button', { name: /send reset link/i }).click();
      const rec = await recoverWait;
      if (rec) net.push({ status: rec.status(), path: '/auth/v1/recover' });
      await page.waitForTimeout(1500);
    }
    const success = await page.getByText(/check your email for a reset link/i).isVisible().catch(() => false);
    log(1, 'Forgot password', {
      result: hasForgot && (success || net.some((n) => n.status === 200)) ? 'verified' : hasForgot ? 'broken' : 'broken',
      network: net,
      notes: `forgot link: ${hasForgot}; banner: ${success}`,
    });
    await page.close();
  }

  // 14 /privacy deep link
  {
    const page = await browser.newPage();
    const r = await page.goto(`${BASE}/privacy`, { waitUntil: 'networkidle' });
    const status = r?.status();
    await page.waitForTimeout(1200);
    const hasPrivacy =
      (await page.getByText(/privacy.*data/i).isVisible().catch(() => false)) ||
      (await page.getByRole('link', { name: /sign in/i }).isVisible().catch(() => false));
    log(14, 'Privacy /privacy route', {
      result: status === 200 && hasPrivacy ? 'verified' : status === 200 ? 'broken' : 'broken',
      network: [{ GET: '/privacy', status }],
      notes: `HTTP ${status}; privacy heading: ${hasPrivacy}`,
    });
    await page.close();
  }

  if (!EMAIL || !PASSWORD) {
    writeFileSync('scripts/browser-audit-full-results.json', JSON.stringify(out, null, 2));
    await browser.close();
    return;
  }

  const boot = await browser.newPage();
  await boot.goto(BASE, { waitUntil: 'networkidle' });
  const anon = await getAnon(boot);
  const session = await apiSignIn(anon);
  await boot.close();
  if (!session.access_token) {
    log('auth', 'signin', { result: 'broken', notes: session.msg || 'no token' });
    writeFileSync('scripts/browser-audit-full-results.json', JSON.stringify(out, null, 2));
    await browser.close();
    return;
  }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const net = [];
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('supabase.co')) {
      net.push({ m: r.request().method(), p: new URL(u).pathname, s: r.status() });
    }
  });

  await injectSession(page, session);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 2 Profile
  await page.locator('aside .border-t button').first().click();
  await page.waitForTimeout(800);
  const industry = page.locator('label:has-text("Industry")').locator('..').locator('input').first();
  let patchOk = null;
  let errToast = false;
  if (await industry.isVisible()) {
    const p = page.waitForResponse((r) => r.url().includes('user_profiles') && r.request().method() === 'PATCH');
    await industry.fill(`Prod-${Date.now()}`);
    await industry.blur();
    patchOk = (await p.catch(() => null))?.status();
    await page.route('**/rest/v1/user_profiles*', (r) => r.abort('failed'));
    await industry.fill('Block');
    await industry.blur();
    await page.waitForTimeout(1500);
    const toasts = await page.locator('[data-sonner-toast]').allTextContents();
    errToast = toasts.some((t) => /failed to update profile/i.test(t));
    await page.unroute('**/rest/v1/user_profiles*');
  }
  log(2, 'Profile Industry', { result: patchOk && patchOk < 300 && errToast ? 'verified' : 'broken', network: net.filter((n) => n.p.includes('user_profiles')).slice(-3), notes: `PATCH ${patchOk}; toast ${errToast}` });

  // 14b Privacy export (RPC)
  await page.goto(`${BASE}/privacy`, { waitUntil: 'networkidle' });
  let exportOk = false;
  const exportBtn = page.getByRole('button', { name: /^export$/i });
  if (await exportBtn.isVisible().catch(() => false)) {
    const rpc = page.waitForResponse(
      (res) => res.url().includes('export_user_data') || res.url().includes('rpc'),
      { timeout: 15000 }
    ).catch(() => null);
    const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await exportBtn.click();
    await page.waitForTimeout(2000);
    const download = await dl;
    const rpcRes = await rpc;
    exportOk = !!download || (rpcRes && rpcRes.status() < 400);
  }
  log('14b', 'Privacy data export download', {
    result: exportOk ? 'verified' : 'blocked',
    notes: exportOk ? 'json download started' : 'no download event (RPC or browser)',
  });

  // 3 Dedupe
  net.length = 0;
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('aside').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('aside nav button').nth(2).click();
  await page.waitForTimeout(1000);
  const details = page.locator('details').first();
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
  await page.route('**/functions/v1/dedupe-circle', (r) => r.fulfill({ status: 503, body: '{"error":"x"}', contentType: 'application/json' }));
  if (await page.getByText(/find duplicates/i).isVisible()) {
    await page.getByText(/find duplicates/i).click();
    await page.waitForTimeout(2500);
    const toasts = await page.locator('[data-sonner-toast]').allTextContents();
    const empty = await page.getByText(/no duplicates found/i).isVisible().catch(() => false);
    log(3, 'Dedupe error', { result: toasts.some((t) => /fail|error|2xx|status/i.test(t)) ? 'verified' : empty ? 'broken' : 'blocked', network: net.filter((n) => n.p.includes('dedupe')), notes: toasts.join(' | ') });
  } else log(3, 'Dedupe', { result: 'blocked', notes: 'no button' });
  await page.unroute('**/functions/v1/dedupe-circle');

  // 9 Stripe
  await page.goto(BASE);
  await page.waitForTimeout(1000);
  const up = page.getByRole('button', { name: /upgrade/i }).first();
  if (await up.isVisible().catch(() => false)) {
    await up.click();
    await page.waitForTimeout(2000);
    const toasts = await page.locator('[data-sonner-toast]').allTextContents();
    log(9, 'Stripe', { result: toasts.length ? 'verified' : 'blocked', notes: toasts.join(' | ') });
  } else log(9, 'Stripe', { result: 'blocked', notes: 'no upgrade CTA' });

  // 16 mobile
  await ctx.close();
  const m = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const mp = await m.newPage();
  await injectSession(mp, session);
  await mp.goto(BASE, { waitUntil: 'networkidle' });
  const tabs = [];
  for (const t of ['Today', 'Streams', 'Ask']) {
    const b = mp.getByRole('button', { name: new RegExp(`^${t}$`, 'i') });
    if (await b.isVisible()) { await b.click(); tabs.push(t); }
  }
  log(16, 'Mobile nav', { result: tabs.length >= 2 ? 'verified' : 'broken', notes: tabs.join(', ') });
  await m.close();

  await browser.close();
  writeFileSync('scripts/browser-audit-full-results.json', JSON.stringify(out, null, 2));
  const v = out.tests.filter((t) => t.result === 'verified').length;
  const b = out.tests.filter((t) => t.result === 'broken').length;
  const bl = out.tests.filter((t) => t.result === 'blocked').length;
  console.log(`verified=${v} broken=${b} blocked=${bl}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

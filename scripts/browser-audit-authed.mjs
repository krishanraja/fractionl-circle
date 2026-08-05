/**
 * Authenticated browser pass - requires AUDIT_EMAIL + AUDIT_PASSWORD env vars.
 * Output: scripts/browser-audit-authed-results.json
 */
import { chromium, devices } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = process.env.AUDIT_BASE_URL || 'https://circle.fractionl.ai';
const EMAIL = process.env.AUDIT_EMAIL;
const PASSWORD = process.env.AUDIT_PASSWORD;
const SUPABASE = 'https://ksyuwacuigshvcyptlhe.supabase.co';

if (!EMAIL || !PASSWORD) {
  console.error('Set AUDIT_EMAIL and AUDIT_PASSWORD');
  process.exit(1);
}

const results = [];
const record = (id, title, data) => results.push({ id, title, ...data });

async function getAnon(page) {
  if (process.env.SUPABASE_ANON) return process.env.SUPABASE_ANON;
  const src = await page.locator('script[src*="index"]').first().getAttribute('src', { timeout: 5000 }).catch(() => null);
  if (!src) {
    // Vite dev: anon key not in HTML - caller should set SUPABASE_ANON
    return null;
  }
  const jsUrl = new URL(src, BASE).href;
  const text = await (await page.request.get(jsUrl)).text();
  return text.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)[0];
}

async function signInViaApi(anon) {
  const r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await r.json();
  if (!body.access_token) throw new Error(body.msg || body.error_description || 'signin failed');
  return body;
}

async function injectSession(page, session) {
  const key = 'sb-ksyuwacuigshvcyptlhe-auth-token';
  const value = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: 'bearer',
    user: session.user,
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const desktop = { viewport: { width: 1440, height: 900 } };
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();
  const net = [];
  const consoleErrs = [];
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('supabase.co') || u.includes('stripe')) {
      net.push({ method: r.request().method(), path: new URL(u).pathname, status: r.status() });
    }
  });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  const anon = await getAnon(page);
  const session = await signInViaApi(anon);
  await injectSession(page, session);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const shellReady = await page.getByRole('button', { name: /^today$/i }).isVisible().catch(() => false)
    || await page.getByText(/first voice|hold to speak/i).isVisible().catch(() => false);

  if (!shellReady) {
    record('auth', 'App shell after login', { result: 'broken', notes: `URL: ${page.url()}` });
    writeFileSync('scripts/browser-audit-authed-results.json', JSON.stringify({ results }, null, 2));
    await browser.close();
    return;
  }

  // 2 Profile / Industry
  const profileBtn = page.locator('aside').getByRole('button', { name: /krish/i }).first();
  await profileBtn.click().catch(() => page.locator('aside button').last().click());
  await page.waitForTimeout(1000);
  const industry = page.locator('label:has-text("Industry") + input, input:near(:text("Industry"))').first();
  let patchStatus = null;
  let errorToast = false;
  if (await industry.isVisible().catch(() => false)) {
    const p1 = page.waitForResponse((r) => r.url().includes('/rest/v1/user_profiles') && r.request().method() === 'PATCH', { timeout: 12000 });
    await industry.fill(`BrowserAudit-${Date.now()}`);
    await industry.blur();
    patchStatus = (await p1.catch(() => null))?.status();
    await page.route('**/rest/v1/user_profiles*', (route) => route.abort('failed'));
    const toastP = page.waitForSelector('[data-sonner-toast]', { timeout: 6000 }).catch(() => null);
    await industry.fill('BlockedIndustry');
    await industry.blur();
    await page.waitForTimeout(1500);
    const toasts = await page.locator('[data-sonner-toast]').allTextContents().catch(() => []);
    errorToast = toasts.some((t) => /failed to update profile|error/i.test(t));
    await page.unroute('**/rest/v1/user_profiles*');
  }
  record(2, 'Profile field saves (Industry)', {
    route: '/',
    steps: ['Profile sheet', 'Industry blur', 'block PATCH', 'blur again'],
    network: net.filter((n) => n.path.includes('user_profiles')).slice(-4),
    console: consoleErrs.slice(0, 5),
    result: patchStatus >= 200 && patchStatus < 300 && errorToast ? 'verified' : patchStatus ? 'broken' : 'blocked',
    notes: `PATCH ${patchStatus}; error toast after block: ${errorToast}`,
  });

  // 3 Dedupe (button lives inside collapsed <details> on Circle)
  net.length = 0;
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  await page.locator('aside').getByRole('button', { name: /^circle$/i }).click();
  await page.waitForTimeout(600);
  const details = page.locator('details').first();
  if ((await details.getAttribute('open')) === null) {
    await details.locator('summary').click();
    await page.waitForTimeout(400);
  }
  await page.route('**/functions/v1/dedupe-circle', (route) =>
    route.fulfill({ status: 503, body: JSON.stringify({ error: 'audit block' }), contentType: 'application/json' })
  );
  const findDup = page.getByText(/find duplicates|review.*duplicate/i);
  if (await findDup.isVisible().catch(() => false)) {
    await findDup.click();
    await page.waitForTimeout(400);
    const rescan = page.getByRole('button', { name: /re-scan|scan now/i });
    if (await rescan.isVisible().catch(() => false)) await rescan.click();
    await page.waitForTimeout(2500);
    const empty = await page.getByText(/no duplicates found/i).isVisible().catch(() => false);
    const toasts = await page.locator('[data-sonner-toast]').allTextContents().catch(() => []);
    const errToast = toasts.some((t) => /fail|error|503|scan/i.test(t));
    record(3, 'Dedupe scan error surfacing', {
      route: 'Circle',
      steps: ['Find duplicates', 'Re-scan with blocked dedupe-circle'],
      network: net.filter((n) => n.path.includes('dedupe')).slice(-3),
      console: consoleErrs.slice(0, 5),
      result: errToast ? 'verified' : empty ? 'broken' : 'blocked',
      notes: `toasts: ${toasts.join(' | ') || 'none'}; empty state: ${empty}`,
    });
  } else {
    record(3, 'Dedupe scan error surfacing', { route: 'Circle', result: 'blocked', notes: 'Find duplicates not visible' });
  }
  await page.unroute('**/functions/v1/dedupe-circle');

  // 14 Privacy via profile navigation (in-app)
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  await profileBtn.click().catch(() => {});
  await page.waitForTimeout(500);
  const privacyLink = page.getByText(/privacy settings/i);
  if (await privacyLink.isVisible().catch(() => false)) {
    await privacyLink.click();
    await page.waitForTimeout(1500);
    const onPrivacy = await page.getByText(/privacy & data settings/i).isVisible().catch(() => false);
    const exportBtn = await page.getByRole('button', { name: /^export$/i }).isVisible().catch(() => false);
    record(14, 'Privacy controls (in-app)', {
      route: '/privacy',
      steps: ['Profile → Privacy settings', 'Export button visible'],
      network: net.filter((n) => n.path.includes('rpc') || n.path.includes('consent')).slice(-5),
      console: consoleErrs.slice(0, 5),
      result: onPrivacy && exportBtn ? 'verified' : 'broken',
      notes: `privacy page: ${onPrivacy}; export: ${exportBtn}`,
    });
  }

  // 9 Stripe - profile or today upgrade
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const upgrade = page.getByRole('button', { name: /upgrade/i }).first();
  if (await upgrade.isVisible().catch(() => false)) {
    await upgrade.click();
    await page.waitForTimeout(2000);
    const toasts = await page.locator('[data-sonner-toast]').allTextContents().catch(() => []);
    record(9, 'Stripe upgrade', {
      route: '/',
      steps: ['Click first Upgrade CTA'],
      network: net.filter((n) => n.path.includes('stripe')).slice(-3),
      console: [],
      result: toasts.some((t) => /not configured|stripe|sign in/i.test(t)) ? 'verified' : 'blocked',
      notes: toasts.join(' | ') || 'no toast',
    });
  }

  // 16 Mobile
  await ctx.close();
  const mctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const mpage = await mctx.newPage();
  await injectSession(mpage, session);
  await mpage.goto(BASE, { waitUntil: 'networkidle' });
  await mpage.waitForTimeout(1500);
  const tabs = [];
  for (const t of ['Today', 'Streams', 'Circle', 'Ask']) {
    const b = mpage.getByRole('button', { name: new RegExp(`^${t}$`, 'i') });
    if (await b.isVisible().catch(() => false)) {
      await b.click();
      await mpage.waitForTimeout(400);
      tabs.push(t);
    }
  }
  record(16, 'Mobile responsive smoke', {
    route: '/',
    steps: tabs.map((t) => `Tap ${t}`),
    network: [],
    console: [],
    result: tabs.length >= 3 ? 'verified' : 'broken',
    notes: `tabs: ${tabs.join(', ')}`,
  });

  await browser.close();
  writeFileSync('scripts/browser-audit-authed-results.json', JSON.stringify({ email: EMAIL, results }, null, 2));
  console.log('Done', results.length, 'tests');
}

main().catch((e) => { console.error(e); process.exit(1); });

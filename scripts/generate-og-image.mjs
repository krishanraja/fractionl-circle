import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public', 'og-image.png');
const wordmark = `data:image/png;base64,${readFileSync(path.join(root, 'public', 'brand', 'fractionl-wordmark.png')).toString('base64')}`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html>
    <html><head><style>
      * { box-sizing: border-box; }
      html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
      body {
        display: grid;
        grid-template-rows: 1fr 154px;
        background: #faf9f5;
        color: #11120f;
        font-family: "Segoe UI Variable Text", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      main { position: relative; padding: 62px 90px 54px; }
      .brand { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 650; letter-spacing: -.04em; }
      .mark { position: relative; width: 34px; height: 34px; }
      .mark::before, .mark::after { content: ""; position: absolute; border: 2px solid #11120f; border-radius: 50%; }
      .mark::before { inset: 1px 7px 7px 1px; }
      .mark::after { inset: 10px 0 0 10px; border-color: #5547f5; background: #e4e1ff; }
      .parent { height: 24px; margin-left: 4px; padding-left: 16px; border-left: 1px solid rgba(17,18,15,.2); display: flex; align-items: center; gap: 7px; color: #686960; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .wordmark { width: 104px; height: 20px; background: #986724; -webkit-mask: url('${wordmark}') center / contain no-repeat; mask: url('${wordmark}') center / contain no-repeat; }
      h1 { margin: 120px 0 0; max-width: 1010px; font-size: 76px; font-weight: 600; letter-spacing: -.065em; line-height: .99; }
      .rule { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: #11120f; }
      .signal { position: absolute; left: 66.25%; bottom: -8px; width: 16px; height: 16px; border: 3px solid #faf9f5; border-radius: 50%; background: #5547f5; }
      footer { display: flex; align-items: center; padding: 0 90px; font-size: 25px; letter-spacing: -.03em; }
    </style></head><body>
      <main>
        <div class="brand"><span class="mark"></span><span>Circle</span><span class="parent"><span>by</span><span class="wordmark"></span></span></div>
        <h1>Remember anyone.<br>Find the right person later.</h1>
        <span class="rule"></span><span class="signal"></span>
      </main>
      <footer>circle.fractionl.ai</footer>
    </body></html>`);
  await page.screenshot({ path: output });
  console.log(`Generated ${output}`);
} finally {
  await browser.close();
}

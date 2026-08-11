import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

const root = process.cwd();
const errors = [];

const gitFiles = (args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);

const markdownFiles = [
  ...new Set([
    ...gitFiles(['ls-files', '*.md']),
    ...gitFiles(['ls-files', '--others', '--exclude-standard', '*.md']),
  ]),
].sort();

const requiredFiles = [
  'README.md',
  'DOCS.md',
  'CONTRIBUTING.md',
  'LICENSE.md',
  'CHANGELOG.md',
  'AGENT_BRIEFING.md',
  '.github/CODEOWNERS',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.env.example',
  'docs/local-development.md',
  'docs/PRODUCT.md',
  'docs/MARKETING_AND_SALES.md',
  'docs/legal/README.md',
  'public/agent.json',
  'public/llms.txt',
  'public/brand/fractionl-wordmark.png',
  'public/brand/fractionl-icon.png',
  'public/favicon.ico',
  'public/favicon.png',
  'public/favicon-64.png',
  'public/apple-touch-icon.png',
  'public/android-chrome-192x192.png',
  'public/android-chrome-512x512.png',
];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    errors.push(`Missing required documentation file: ${file}`);
  }
}

const slugHeadings = (content) => {
  const counts = new Map();
  const anchors = new Set();

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!match) continue;

    const base = match[1]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/[`*_~]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s+/g, '-');

    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
};

const headingCache = new Map();
const anchorsFor = (file) => {
  if (!headingCache.has(file)) {
    headingCache.set(file, slugHeadings(readFileSync(file, 'utf8')));
  }
  return headingCache.get(file);
};

let relativeLinkCount = 0;

for (const markdownFile of markdownFiles) {
  const absoluteFile = join(root, markdownFile);
  const content = readFileSync(absoluteFile, 'utf8');
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;

  for (const match of content.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (target.startsWith('<') && target.includes('>')) {
      target = target.slice(1, target.indexOf('>'));
    } else {
      target = target.split(/\s+["']/)[0];
    }

    if (/^(?:[a-z]+:|\/\/)/i.test(target)) continue;

    relativeLinkCount += 1;
    const [rawPath, rawAnchor] = target.split('#', 2);
    const decodedPath = decodeURIComponent(rawPath || '');
    const targetFile = decodedPath
      ? resolve(dirname(absoluteFile), decodedPath)
      : absoluteFile;

    if (!existsSync(targetFile)) {
      errors.push(`${markdownFile}: missing link target ${target}`);
      continue;
    }

    if (rawAnchor && extname(targetFile).toLowerCase() === '.md') {
      const anchor = decodeURIComponent(rawAnchor).toLowerCase();
      if (!anchorsFor(targetFile).has(anchor)) {
        errors.push(`${markdownFile}: missing heading #${rawAnchor} in ${decodedPath || markdownFile}`);
      }
    }
  }
}

const corePromise = 'Remember anyone. Find the right person when they can help.';
const product = readFileSync(join(root, 'docs/PRODUCT.md'), 'utf8');
const briefing = readFileSync(join(root, 'AGENT_BRIEFING.md'), 'utf8');
const goToMarket = readFileSync(join(root, 'docs/MARKETING_AND_SALES.md'), 'utf8');
const llms = readFileSync(join(root, 'public/llms.txt'), 'utf8');
const appSource = readFileSync(join(root, 'src/App.tsx'), 'utf8');
const tiersSource = readFileSync(join(root, 'src/lib/tiers.ts'), 'utf8');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const circleBrandSource = readFileSync(join(root, 'src/components/circle/CircleBrand.tsx'), 'utf8');
const circleSystem = readFileSync(join(root, 'src/pathroom/circle-system.css'), 'utf8');
const ogGenerator = readFileSync(join(root, 'scripts/generate-og-image.mjs'), 'utf8');
const manifest = JSON.parse(readFileSync(join(root, 'public/site.webmanifest'), 'utf8'));

for (const [file, content, expectedAsset] of [
  ['src/pathroom/circle-system.css', circleSystem, '/brand/fractionl-wordmark.png'],
  ['src/pathroom/circle-system.css', circleSystem, '/brand/fractionl-icon.png'],
  ['scripts/generate-og-image.mjs', ogGenerator, 'fractionl-wordmark.png'],
]) {
  if (!content.includes(expectedAsset)) {
    errors.push(`${file} does not reference ${expectedAsset}`);
  }
}

if (!circleBrandSource.includes("signature = 'icon'")) {
  errors.push('CircleBrand does not default to the compact Fractionl icon signature');
}

const htmlThemeColor = indexHtml.match(/<meta name="theme-color" content="([^"]+)"/i)?.[1];
const tileColor = indexHtml.match(/<meta name="msapplication-TileColor" content="([^"]+)"/i)?.[1];
if (!htmlThemeColor || htmlThemeColor !== manifest.theme_color) {
  errors.push('index.html theme color does not match public/site.webmanifest');
}
if (!tileColor || tileColor !== manifest.theme_color) {
  errors.push('index.html tile color does not match public/site.webmanifest');
}

for (const icon of manifest.icons || []) {
  const iconPath = icon.src?.replace(/^\//, '');
  if (!iconPath || !existsSync(join(root, 'public', iconPath))) {
    errors.push(`public/site.webmanifest references missing icon ${icon.src || '(empty)'}`);
  }
}

for (const [file, content] of [
  ['docs/PRODUCT.md', product],
  ['AGENT_BRIEFING.md', briefing],
  ['docs/MARKETING_AND_SALES.md', goToMarket],
  ['public/llms.txt', llms],
]) {
  if (!content.includes(corePromise)) {
    errors.push(`${file} does not contain the canonical product promise`);
  }
}

for (const heading of [
  '## Training contract',
  '## Working buyer hypothesis',
  '## Pain and changed belief',
  '## Approved claims and evidence',
  '## Product limits to disclose',
  '## Objection handling',
  '## Sales conversation protocol',
  '## Agent operating rules',
  '## Refresh protocol',
]) {
  if (!goToMarket.includes(heading)) {
    errors.push(`docs/MARKETING_AND_SALES.md is missing ${heading}`);
  }
}

let agent;
try {
  agent = JSON.parse(readFileSync(join(root, 'public/agent.json'), 'utf8'));
} catch (error) {
  errors.push(`public/agent.json is not valid JSON: ${error.message}`);
}

if (agent) {
  if (agent.promise !== corePromise) {
    errors.push('public/agent.json promise does not match the canonical product promise');
  }

  for (const field of [
    'source_of_truth',
    'claim_classes',
    'buyer',
    'message',
    'live',
    'trust',
    'limits',
    'pricing',
    'approved_claims',
    'prohibited_claims',
    'agent_rules',
    'urls',
    'refresh_triggers',
  ]) {
    if (agent[field] === undefined) {
      errors.push(`public/agent.json is missing ${field}`);
    }
  }

  for (const [key, value] of Object.entries(agent.urls || {})) {
    if (['llms_txt', 'agent_json'].includes(key)) continue;
    let path;
    try {
      path = new URL(value).pathname;
    } catch {
      errors.push(`public/agent.json urls.${key} is not a valid URL`);
      continue;
    }

    const sourcePath = path === '/' ? '/' : path.replace(/\/$/, '');
    if (!appSource.includes(`path="${sourcePath}"`)) {
      errors.push(`public/agent.json urls.${key} points to ${path}, which is not declared in src/App.tsx`);
    }
  }

  const tierPrice = (slug) => {
    const match = tiersSource.match(new RegExp(`slug: '${slug}'[\\s\\S]*?priceMonthly: (\\d+)`));
    return match ? Number(match[1]) : null;
  };
  const freePrice = tierPrice('free');
  const proPrice = tierPrice('pro');

  if (freePrice === null || proPrice === null) {
    errors.push('Could not read Free and Pro prices from src/lib/tiers.ts');
  } else {
    if (agent.pricing?.free_monthly !== freePrice) {
      errors.push(`public/agent.json Free price does not match src/lib/tiers.ts (${freePrice})`);
    }
    if (agent.pricing?.free !== freePrice) {
      errors.push(`public/agent.json compatibility Free price does not match src/lib/tiers.ts (${freePrice})`);
    }
    if (agent.pricing?.pro_monthly !== proPrice) {
      errors.push(`public/agent.json Pro price does not match src/lib/tiers.ts (${proPrice})`);
    }
    if (agent.pricing?.pro_monthly_usd !== proPrice) {
      errors.push(`public/agent.json compatibility Pro price does not match src/lib/tiers.ts (${proPrice})`);
    }
    if (!llms.includes(`Pro is listed at $${proPrice} per month`)) {
      errors.push('public/llms.txt Pro price does not match src/lib/tiers.ts');
    }
    if (!indexHtml.includes(`"name": "Pro"`) || !indexHtml.includes(`"price": "${proPrice}"`)) {
      errors.push('index.html structured-data Pro price does not match src/lib/tiers.ts');
    }
  }
}

for (const file of [
  'README.md',
  'DOCS.md',
  'AGENT_BRIEFING.md',
  'docs/PRODUCT.md',
  'docs/MARKETING_AND_SALES.md',
  'public/llms.txt',
]) {
  const content = readFileSync(join(root, file), 'utf8');
  if (/[—]|â|Ã|�/.test(content)) {
    errors.push(`${file} contains an em dash or mangled text encoding`);
  }
}

const walk = (directory) => {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
};

const sourceFiles = walk(join(root, 'src')).filter((file) => /\.[cm]?[jt]sx?$/.test(file));
const sourceViteVariables = new Set();

for (const file of sourceFiles) {
  for (const match of readFileSync(file, 'utf8').matchAll(/VITE_[A-Z0-9_]+/g)) {
    sourceViteVariables.add(match[0]);
  }
}

const exampleContent = readFileSync(join(root, '.env.example'), 'utf8');
const documentedVariables = new Set(
  [...exampleContent.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]),
);

for (const variable of sourceViteVariables) {
  if (!documentedVariables.has(variable)) {
    errors.push(`.env.example does not document ${variable}`);
  }
}

if (exampleContent.includes('VITE_PATH_ROOM_ENABLED')) {
  errors.push('.env.example contains the retired VITE_PATH_ROOM_ENABLED flag');
}

const readme = readFileSync(join(root, 'README.md'), 'utf8');
for (const requiredReference of [
  '.env.example',
  'docs/local-development.md',
  'CONTRIBUTING.md',
  'LICENSE.md',
]) {
  if (!readme.includes(requiredReference)) {
    errors.push(`README.md does not reference ${requiredReference}`);
  }
}

for (const markdownFile of markdownFiles) {
  if (/^(?:docs\/_archive\/|_upgrade\/|AUDIT_|NON_FUNCTIONAL_AUDIT_REPORT)/.test(markdownFile)) {
    continue;
  }

  const content = readFileSync(join(root, markdownFile), 'utf8');
  if (/\[PLACEHOLDER\]|\[COUNSEL TO CONFIRM\]/.test(content)) {
    errors.push(`${markdownFile} contains an unresolved placeholder token`);
  }
}

if (errors.length) {
  console.error('Documentation check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Documentation checks passed: ${markdownFiles.length} Markdown files, ${relativeLinkCount} relative links, ${sourceViteVariables.size} frontend environment variables.`,
  );
}

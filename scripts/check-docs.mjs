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
  '.github/CODEOWNERS',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.env.example',
  'docs/local-development.md',
  'docs/legal/README.md',
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

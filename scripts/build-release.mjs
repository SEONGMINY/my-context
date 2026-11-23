import { execFileSync } from 'node:child_process';
import {
  closeSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync,
} from 'node:fs';
import { basename, dirname, join, posix } from 'node:path';
import { assertCommitSha, chubBin, releases, root } from './release-paths.mjs';

const manifestPath = 'publish-skills.json';
const workflowAuthor = 'workflows';

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', ...options });
}

function readTree(revision) {
  const listing = git(['ls-tree', '-rz', revision, '--', 'content', 'skills', manifestPath]);
  return new Map(listing.split('\0').filter(Boolean).map((record) => {
    const separator = record.indexOf('\t');
    const [mode, type, oid] = record.slice(0, separator).split(' ');
    return [record.slice(separator + 1), { mode, type, oid }];
  }));
}

function requireRegularFile(path, entry) {
  if (entry?.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) {
    throw new Error(`Expected a regular committed file: ${path}`);
  }
}

function publishedSkills(tree) {
  const manifest = tree.get(manifestPath);
  if (!manifest) return [];
  requireRegularFile(manifestPath, manifest);

  const slugs = JSON.parse(git(['cat-file', 'blob', manifest.oid]));
  if (!Array.isArray(slugs) || slugs.some((slug) => typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    throw new Error(`${manifestPath} must be an array of lowercase skill slugs`);
  }
  if (new Set(slugs).size !== slugs.length) {
    throw new Error(`${manifestPath} must contain unique published skills`);
  }
  for (const slug of slugs) {
    const entryPath = `skills/${slug}/SKILL.md`;
    requireRegularFile(entryPath, tree.get(entryPath));
  }
  return slugs;
}

function copyBlob(stage, sourcePath, targetPath, entry) {
  requireRegularFile(sourcePath, entry);
  const segments = targetPath.split('/');
  if (targetPath.includes('\\') || segments.some((part) => !part || part === '.' || part === '..') || basename(targetPath).toLowerCase() === 'registry.json') {
    throw new Error(`Invalid release asset path: ${sourcePath}`);
  }
  const path = join(stage, ...segments);
  mkdirSync(dirname(path), { recursive: true });
  const file = openSync(path, 'wx', entry.mode === '100755' ? 0o755 : 0o644);
  try {
    git(['cat-file', 'blob', entry.oid], { stdio: ['ignore', file, 'inherit'] });
  } finally {
    closeSync(file);
  }
}

function underContentEntry(path, entries) {
  for (let directory = posix.dirname(path); directory.startsWith('content/'); directory = posix.dirname(directory)) {
    if (entries.has(directory)) return true;
  }
  return false;
}

function stageAssets(stage, tree, skills) {
  const enabledSkills = new Set(skills);
  const contentEntries = new Set([...tree.keys()]
    .filter((path) => path.startsWith('content/') && posix.dirname(path) !== 'content' &&
      ['DOC.md', 'SKILL.md'].includes(posix.basename(path)))
    .map(posix.dirname));
  for (const [sourcePath, entry] of tree) {
    const [area, first, ...rest] = sourcePath.split('/');
    if (basename(sourcePath) === '.gitkeep') continue;
    if (area === 'content' && underContentEntry(sourcePath, contentEntries)) {
      if (first.startsWith('.') || ['dist', workflowAuthor].includes(first)) {
        throw new Error(`Expected a content asset under a valid author directory: ${sourcePath}`);
      }
      copyBlob(stage, sourcePath, [first, ...rest].join('/'), entry);
    } else if (area === 'skills' && enabledSkills.has(first)) {
      copyBlob(stage, sourcePath, [workflowAuthor, first, ...rest].join('/'), entry);
    }
  }
}

function releaseExists(path) {
  const directory = lstatSync(path, { throwIfNoEntry: false });
  if (!directory) return false;
  if (!directory.isDirectory() || !['registry.json', 'search-index.json'].every((name) =>
    lstatSync(join(path, name), { throwIfNoEntry: false })?.isFile())) {
    throw new Error(`Incomplete release exists: ${path}`);
  }
  return true;
}

function verifyRegistry(path, skills) {
  const { docs, skills: published } = JSON.parse(readFileSync(join(path, 'registry.json'), 'utf8'));
  const ids = [...docs, ...published].map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error('Release contains duplicate Context Hub IDs');
  const workflowEntries = published.filter(({ id }) => id.startsWith(`${workflowAuthor}/`));
  if (workflowEntries.length !== skills.length || docs.some(({ id }) => id.startsWith(`${workflowAuthor}/`))) {
    throw new Error('Each published workflow must have only one Context Hub entry');
  }
  for (const slug of skills) {
    if (!workflowEntries.some((entry) => entry.path === `${workflowAuthor}/${slug}` && entry.id === `${workflowAuthor}/${slug}`)) {
      throw new Error(`Published skill name must match its directory: ${slug}`);
    }
  }
}

function buildRelease(revision) {
  const sha = git(['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`]).trim();
  assertCommitSha(sha);
  const release = join(releases, sha);
  if (releaseExists(release)) return sha;

  const tree = readTree(sha);
  const skills = publishedSkills(tree);
  mkdirSync(releases, { recursive: true, mode: 0o700 });
  const temporary = mkdtempSync(join(releases, '.build-'));
  try {
    const stage = join(temporary, 'source');
    const output = join(temporary, 'output');
    mkdirSync(stage);
    stageAssets(stage, tree, skills);
    execFileSync(process.execPath, [
      join(chubBin, 'chub'), 'build', stage, '-o', output,
    ], {
      stdio: ['ignore', 2, 2],
      env: { ...process.env, CHUB_DIR: temporary, CHUB_TELEMETRY: '0', CHUB_FEEDBACK: '0' },
    });
    verifyRegistry(output, skills);
    try {
      renameSync(output, release);
    } catch (error) {
      // An identical revision may have been published by another build.
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code) || !releaseExists(release)) throw error;
    }
    return sha;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

try {
  const [revision = 'HEAD', ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error('Usage: node scripts/build-release.mjs [git-revision]');
  console.log(buildRelease(revision));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

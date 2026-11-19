import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { assertCommitSha, releases, root } from './release-paths.mjs';

const sha = execFileSync(process.execPath, [join(root, 'scripts/build-release.mjs'), ...process.argv.slice(2)], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
}).trim();
assertCommitSha(sha);

const snapshot = join(releases, sha);
const registry = JSON.parse(readFileSync(join(snapshot, 'registry.json'), 'utf8'));
const searchIndex = JSON.parse(readFileSync(join(snapshot, 'search-index.json'), 'utf8'));
const decoder = new TextDecoder('utf-8', { fatal: true });

function packFiles({ path, files }, entryPoint) {
  return [...new Set([entryPoint, ...(files || [])])].map((file) => {
    const absolute = resolve(snapshot, path, file);
    const location = relative(snapshot, absolute);
    if (!location || isAbsolute(location) || location === '..' || location.startsWith(`..${sep}`)) {
      throw new Error(`Asset outside release: ${file}`);
    }
    return [file, decoder.decode(readFileSync(absolute))];
  });
}

const entries = [
  ...registry.skills.map(({ id, name, description, tags, ...asset }) => ({
    id, name, description, tags, type: 'skill', files: packFiles(asset, 'SKILL.md'),
  })),
  ...registry.docs.map(({ id, name, description, tags, languages }) => ({
    id, name, description, tags, type: 'doc', languages: languages.map(({ language, recommendedVersion, versions }) => ({
      language, recommendedVersion, versions: versions.map(({ version, ...asset }) => ({
        version, files: packFiles(asset, 'DOC.md'),
      })),
    })),
  })),
];

const output = join(root, '.generated/worker');
mkdirSync(output, { recursive: true, mode: 0o700 });
const temporary = mkdtempSync(join(output, '.build-'));
try {
  const candidate = join(temporary, 'release.json');
  writeFileSync(candidate, JSON.stringify({ sha, entries, searchIndex }), { mode: 0o600 });
  renameSync(candidate, join(output, 'release.json'));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
console.log(`Prepared Worker bundle for ${sha} (${entries.length} entries).`);

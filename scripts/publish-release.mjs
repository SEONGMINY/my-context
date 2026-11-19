import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertCommitSha, chubBin, chubEnvironment, releases, root } from './release-paths.mjs';

function publish(args) {
  const sha = execFileSync(process.execPath, [join(root, 'scripts/build-release.mjs'), ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
  assertCommitSha(sha);

  const snapshot = join(releases, sha);
  const registry = JSON.parse(readFileSync(join(snapshot, 'registry.json'), 'utf8'));
  JSON.parse(readFileSync(join(snapshot, 'search-index.json'), 'utf8'));
  const expectedIds = [...registry.docs, ...registry.skills].map((entry) => entry.id).sort();
  const env = chubEnvironment(sha);
  mkdirSync(env.CHUB_DIR, { recursive: true, mode: 0o700 });

  const candidate = mkdtempSync(join(releases, '.publish-'));
  try {
    const config = join(candidate, 'config.yaml');
    writeFileSync(config, [
      'sources:',
      '  - name: personal',
      `    path: ${JSON.stringify(snapshot)}`,
      'telemetry: false',
      'feedback: false',
      'help_url: null',
      '',
    ].join('\n'), { mode: 0o600 });
    renameSync(config, join(env.CHUB_DIR, 'config.yaml'));

    const output = execFileSync(process.execPath, [
      join(chubBin, 'chub'), 'search', '--limit', String(Math.max(1, expectedIds.length)), '--json',
    ], { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const actualIds = JSON.parse(output).results.map((entry) => entry.id).sort();
    if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
      throw new Error('Context Hub did not load the complete release registry.');
    }

    const next = join(candidate, 'current');
    // Workers read this relative link once and use that immutable snapshot.
    symlinkSync(sha, next, 'dir');
    renameSync(next, join(releases, 'current'));
  } finally {
    rmSync(candidate, { recursive: true, force: true });
  }

  console.log(sha);
}

try {
  if (process.argv.length > 3) throw new Error('Usage: node scripts/publish-release.mjs [git-revision]');
  publish(process.argv.slice(2));
} catch (error) {
  console.error(`Release not published: ${error.message}`);
  process.exitCode = 1;
}

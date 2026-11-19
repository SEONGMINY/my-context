import { readlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const releases = resolve(root, process.env.MY_CONTEXT_RELEASES_DIR || '.generated/releases');
export const chubBin = join(root, 'node_modules/@aisuite/chub/bin');

export function assertCommitSha(sha) {
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(sha)) {
    throw new Error('Expected a full Git commit SHA.');
  }
}

export function activeSha() {
  const sha = readlinkSync(join(releases, 'current'));
  assertCommitSha(sha);
  return sha;
}

export function chubEnvironment(sha) {
  return {
    CHUB_DIR: join(releases, '.config', sha),
    CHUB_TELEMETRY: '0',
    CHUB_FEEDBACK: '0',
  };
}

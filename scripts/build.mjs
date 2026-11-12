import { rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '.generated/context-hub');
// Only this reproducible, ignored output is removed. Never touch sources.
rmSync(output, { recursive: true, force: true });
mkdirSync(join(root, '.generated'), { recursive: true });
const result = spawnSync(process.execPath, [
  join(root, 'node_modules/@aisuite/chub/bin/chub'), 'build',
  join(root, 'content'), '-o', output
], {
  stdio: 'inherit',
  env: { ...process.env, CHUB_DIR: join(root, '.local/chub'), CHUB_TELEMETRY: '0', CHUB_FEEDBACK: '0' }
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

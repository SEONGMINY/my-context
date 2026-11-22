import { mkdirSync, lstatSync, realpathSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'skills/manage-dev-knowledge');
const target = join(homedir(), '.agents/skills/manage-dev-knowledge');
const args = process.argv.slice(2);
if (args.length > 1 || (args[0] && args[0] !== '--check')) {
  throw new Error('Usage: npm run install:user -- [--check]');
}
let exists = false;
try {
  const stat = lstatSync(target);
  exists = true;
  if (!stat.isSymbolicLink() || realpathSync(target) !== realpathSync(source)) {
    throw new Error('Existing skill preserved; target differs: ' + target);
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (!args.includes('--check') && !exists) {
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(source, target, 'dir');
}
console.log(JSON.stringify({ mode: args.includes('--check') ? 'check' : 'install',
  skill: { path: target, action: exists ? 'keep' : 'link' } }, null, 2));

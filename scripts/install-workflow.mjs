import { lstatSync, mkdirSync, realpathSync, symlinkSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'skills/development-workflow');
const args = process.argv.slice(2);
if (args.length > 1 || (args[0] && args[0] !== '--check')) {
  throw new Error('Usage: npm run install:workflow -- [--check]');
}
if (!existsSync(join(source, 'SKILL.md'))) {
  throw new Error('Missing development-workflow/SKILL.md');
}

// Codex and Pi read ~/.agents/skills; Claude Code reads ~/.claude/skills.
// Preflight BOTH destinations, then mutate. Never replace unrelated content.
const destinations = [
  join(homedir(), '.agents/skills/development-workflow'),
  join(homedir(), '.claude/skills/development-workflow'),
];

function inspect(destination) {
  try {
    const entry = lstatSync(destination);
    if (!entry.isSymbolicLink() || realpathSync(destination) !== realpathSync(source)) {
      throw new Error('Existing skill preserved; target differs: ' + destination);
    }
    return { path: destination, action: 'keep' };
  } catch (error) {
    if (error.code === 'ENOENT' && error.path === destination) {
      return { path: destination, action: 'link' };
    }
    throw error;
  }
}

const plan = destinations.map(inspect);
if (!args.includes('--check')) {
  for (const { path, action } of plan) {
    if (action === 'link') {
      mkdirSync(dirname(path), { recursive: true });
      symlinkSync(source, path, 'dir');
    }
  }
}
console.log(JSON.stringify({ mode: args.includes('--check') ? 'check' : 'install', skills: plan }, null, 2));

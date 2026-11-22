import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, lstatSync, renameSync, rmSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POLICY = readFileSync(join(ROOT, 'policies/asset-usage.md'), 'utf8').trimEnd();
const START = '<!-- my-context:asset-usage:start -->';
const END = '<!-- my-context:asset-usage:end -->';
const META = /^<!-- my-context:asset-usage:meta created=([01]) gap=([012]) sha256=([a-f0-9]{64}) -->$/;
const action = process.argv[2];
if (process.argv.length !== 3 || !['--check', '--install'].includes(action)) {
  console.error('Usage: node scripts/install-asset-usage.mjs --check|--install');
  process.exit(2);
}
const home = homedir();
const targets = [
  ['codex', join(process.env.CODEX_HOME || join(home, '.codex'), 'AGENTS.md')],
  ['pi', join(process.env.PI_CODING_AGENT_DIR || join(home, '.pi/agent'), 'AGENTS.md')],
  ['claude', join(process.env.CLAUDE_CONFIG_DIR || join(home, '.claude'), 'CLAUDE.md')],
];

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
function inspect(path) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) return { existed: false, source: '', mode: 0o644 };
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Refusing to change a non-regular file: ' + path);
  return { existed: true, source: readFileSync(path, 'utf8'), mode: stat.mode & 0o777 };
}
function managed(source, path) {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start === -1 && end === -1) {
    if (source.includes('my-context:asset-usage:meta')) throw new Error('Orphaned my-context metadata: ' + path);
    return null;
  }
  if (start === -1 || end < start || source.indexOf(START, start + START.length) !== -1 || source.indexOf(END, end + END.length) !== -1) {
    throw new Error('Malformed my-context section: ' + path);
  }
  const raw = source.slice(start + START.length, end);
  const match = raw.match(/^\n(<!-- my-context:asset-usage:meta[^\n]* -->)\n([\s\S]*)\n$/);
  const metadata = match?.[1].match(META);
  if (!metadata || digest(match[2]) !== metadata[3]) {
    throw new Error('Modified or unrecognized managed policy section; refusing to overwrite: ' + path);
  }
  return {
    start,
    end: end + END.length,
    created: metadata[1] === '1',
    gap: Number(metadata[2]),
    body: match[2],
  };
}
function block(created, gap) {
  const meta = '<!-- my-context:asset-usage:meta created=' + (created ? '1' : '0') +
    ' gap=' + gap + ' sha256=' + digest(POLICY) + ' -->';
  return START + '\n' + meta + '\n' + POLICY + '\n' + END;
}
function verifyPlacement(source, section, path) {
  if (!section) return;
  const prefix = '\n'.repeat(section.gap);
  if (section.start < prefix.length ||
      source.slice(section.start - prefix.length, section.start) !== prefix ||
      source[section.end] !== '\n') {
    throw new Error('Managed policy boundary was changed; refusing to modify: ' + path);
  }
}
function plan(path, old) {
  const section = managed(old.source, path);
  verifyPlacement(old.source, section, path);
  if (action === '--check') {
    return { next: old.source, status: !section ? 'missing' : section.body === POLICY ? 'current' : 'outdated' };
  }
  if (section) {
    return { next: old.source.slice(0, section.start) + block(section.created, section.gap) + old.source.slice(section.end) };
  }
  // Retain the exact separator and previous-file metadata to upgrade existing policy blocks safely.
  const gap = !old.source ? 0 : old.source.endsWith('\n') ? 1 : 2;
  return { next: old.source + '\n'.repeat(gap) + block(!old.existed, gap) + '\n' };

}
function atomicWrite(path, content, mode) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = join(dirname(path), '.my-context-' + process.pid + '-' + Math.random().toString(16).slice(2));
  try {
    writeFileSync(tmp, content, { mode, flag: 'wx' });
    chmodSync(tmp, mode);
    renameSync(tmp, path);
  } finally {
    rmSync(tmp, { force: true });
  }
}
function sameFile(actual, expected) {
  return actual.existed === expected.existed &&
    actual.source === expected.source && actual.mode === expected.mode;
}
function restore(path, previous, written) {
  if (!sameFile(inspect(path), written)) {
    throw new Error('Rollback blocked by a concurrent file change: ' + path);
  }
  if (previous.existed) atomicWrite(path, previous.source, previous.mode);
  else rmSync(path, { force: true });
}

try {
  // Validate all three targets before writing any of them.
  const planned = targets.map(([agent, path]) => {
    const before = inspect(path);
    return { agent, path, before, ...plan(path, before) };
  });
  if (action === '--check') {
    console.log(JSON.stringify({ action, results: planned.map(({ agent, path, status }) => ({ agent, path, status })) }, null, 2));
  } else {
    const changed = [];
    try {
      for (const item of planned) {
        if (item.before.source === item.next) continue;
        if (!sameFile(inspect(item.path), item.before)) {
          throw new Error('File changed after preflight: ' + item.path);
        }
        atomicWrite(item.path, item.next, item.before.mode);
        changed.push({
          ...item,
          written: { existed: true, source: item.next, mode: item.before.mode },
        });
      }
    } catch (error) {
      const rollbackErrors = [];
      for (const item of changed.reverse()) {
        try { restore(item.path, item.before, item.written); }
        catch (rollbackError) { rollbackErrors.push(rollbackError.message); }
      }
      throw new Error(error.message + (rollbackErrors.length ? '\nRollback incomplete:\n' + rollbackErrors.join('\n') : ''));
    }
    console.log(JSON.stringify({ action, changed: changed.map(({ agent, path }) => ({ agent, path })) }, null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync, mkdtempSync, renameSync, rmSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POLICY = readFileSync(join(ROOT, 'policies/asset-usage.md'), 'utf8').trimEnd();
const START = '<!-- my-context:asset-usage:start -->';
const END = '<!-- my-context:asset-usage:end -->';
const args = process.argv.slice(2);
if (args.length !== 1 || !['--check', '--enable', '--disable'].includes(args[0])) {
  console.error('Usage: node scripts/install-asset-usage.mjs --check|--enable|--disable');
  process.exit(2);
}
const action = args[0];
const home = homedir();
const targets = [
  ['codex', join(process.env.CODEX_HOME || join(home, '.codex'), 'AGENTS.md')],
  ['pi', join(process.env.PI_CODING_AGENT_DIR || join(home, '.pi/agent'), 'AGENTS.md')],
  ['claude', join(process.env.CLAUDE_CONFIG_DIR || join(home, '.claude'), 'CLAUDE.md')],
];

function inspect(path) {
  if (!existsSync(path)) return { existed: false, source: '', mode: 0o644 };
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Refusing to change a non-regular file: ' + path);
  return { existed: true, source: readFileSync(path, 'utf8'), mode: stat.mode & 0o777 };
}
function locate(source, path) {
  const start = source.indexOf(START), end = source.indexOf(END);
  if ((start === -1) !== (end === -1) || (start !== -1 && (end < start || source.indexOf(START, start + 1) !== -1 || source.indexOf(END, end + 1) !== -1))) {
    throw new Error('Malformed my-context section: ' + path);
  }
  return start === -1 ? null : { start, end: end + END.length };
}
function nextContent(source, path) {
  const block = START + '\n' + POLICY + '\n' + END;
  const section = locate(source, path);
  if (action === '--disable') {
    if (!section) return source;
    const prefix = source.slice(0, section.start).replace(/\n{1,2}$/, '');
    const suffix = source.slice(section.end).replace(/^\n{1,2}/, '');
    return prefix && suffix ? prefix + '\n\n' + suffix : prefix || suffix;
  }
  if (action === '--check') return source;
  if (section) return source.slice(0, section.start) + block + source.slice(section.end);
  return source.trimEnd() ? source.trimEnd() + '\n\n' + block + '\n' : block + '\n';
}
function atomicWrite(path, content, mode) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(dirname(path), '.my-context-' + process.pid + '-' + Math.random().toString(16).slice(2));
  try {
    writeFileSync(temporary, content, { mode, flag: 'wx' });
    chmodSync(temporary, mode);
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}
try {
  // Validate every target before mutating any target.
  const planned = targets.map(([agent, path]) => {
    const old = inspect(path);
    const section = locate(old.source, path);
    return { agent, path, ...old, installed: !!section, next: nextContent(old.source, path) };
  });
  if (action === '--check') {
    const results = planned.map(({ agent, path, source, installed }) => ({
      agent, path, status: !installed ? 'disabled' : source.includes(POLICY) ? 'enabled' : 'outdated',
    }));
    console.log(JSON.stringify({ action, results }, null, 2));
  } else {
    const changed = [];
    try {
      for (const item of planned) {
        if (item.source === item.next) continue;
        if (!item.existed && action === '--disable') continue;
        atomicWrite(item.path, item.next, item.mode);
        changed.push(item);
      }
    } catch (error) {
      for (const item of changed.reverse()) {
        if (item.existed) atomicWrite(item.path, item.source, item.mode);
        else rmSync(item.path, { force: true });
      }
      throw error;
    }
    console.log(JSON.stringify({ action, changed: changed.map(({ agent, path }) => ({ agent, path })) }, null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

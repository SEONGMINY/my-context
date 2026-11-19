import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const installer = join(root, 'scripts/install-workflow.mjs');
const skill = join(root, 'skills/development-workflow');
const common = (home) => join(home, '.agents/skills/development-workflow');
const claude = (home) => join(home, '.claude/skills/development-workflow');

function run(home, ...args) {
  return spawnSync(process.execPath, [installer, ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

async function withHome(callback) {
  const home = mkdtempSync(join(tmpdir(), 'my-context-workflow-test-'));
  try {
    await callback(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

test('--check is read-only and describes both targets', async () => withHome((home) => {
  const result = run(home, '--check');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).skills.map((item) => item.action), ['link', 'link']);
  assert.equal(existsSync(join(home, '.agents')), false);
  assert.equal(existsSync(join(home, '.claude')), false);
}));

test('installation links a single source for Codex/Pi and Claude and is idempotent', async () => withHome((home) => {
  const first = run(home);
  assert.equal(first.status, 0, first.stderr);
  for (const path of [common(home), claude(home)]) {
    assert.equal(lstatSync(path).isSymbolicLink(), true);
    assert.equal(realpathSync(path), realpathSync(skill));
  }
  const second = run(home);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(JSON.parse(second.stdout).skills.map((item) => item.action), ['keep', 'keep']);
  const check = run(home, '--check');
  assert.equal(check.status, 0, check.stderr);
  assert.deepEqual(JSON.parse(check.stdout).skills.map((item) => item.action), ['keep', 'keep']);
}));

test('a conflicting destination prevents all writes', async () => withHome((home) => {
  const blocked = claude(home);
  mkdirSync(blocked, { recursive: true });
  writeFileSync(join(blocked, 'SKILL.md'), 'unrelated skill');
  const result = run(home);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Existing skill preserved/);
  assert.equal(existsSync(join(home, '.agents')), false);
  assert.equal(lstatSync(blocked).isDirectory(), true);
}));

test('unknown arguments are rejected without writes', async () => withHome((home) => {
  const result = run(home, '--force');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
  assert.equal(existsSync(join(home, '.agents')), false);
}));

test('a dangling symlink prevents partial installation', async () => withHome((home) => {
  const blocked = claude(home);
  mkdirSync(join(home, '.claude/skills'), { recursive: true });
  symlinkSync(join(home, 'missing-skill'), blocked, 'dir');
  const result = run(home);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Existing skill preserved/);
  assert.equal(existsSync(join(home, '.agents')), false);
  assert.equal(lstatSync(blocked).isSymbolicLink(), true);
}));

test('installed files are discoverable by path with intact metadata and relative contracts', async () => withHome((home) => {
  const result = run(home);
  assert.equal(result.status, 0, result.stderr);
  const source = readFileSync(join(skill, 'SKILL.md'), 'utf8');
  for (const target of [common(home), claude(home)]) {
    const installed = readFileSync(join(target, 'SKILL.md'), 'utf8');
    assert.equal(installed, source);
    assert.match(installed, /^---\nname: development-workflow\ndescription: ".+"\n---\n/);
    assert.match(installed, /\]\(references\/contracts\.md\)/);
    assert.match(readFileSync(join(target, 'references/contracts.md'), 'utf8'), /G1 Contract/);
    assert.match(readFileSync(join(target, 'references/contracts.md'), 'utf8'), /G6 Methodology/);
  }
}));

test('an existing file in the first client location is never overwritten', async () => withHome((home) => {
  const blocked = common(home);
  mkdirSync(join(home, '.agents/skills'), { recursive: true });
  writeFileSync(blocked, 'original personal skill');
  const result = run(home);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Existing skill preserved/);
  assert.equal(readFileSync(blocked, 'utf8'), 'original personal skill');
  assert.equal(existsSync(join(home, '.claude')), false);
}));

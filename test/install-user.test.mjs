import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, lstatSync, realpathSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const installer = join(root, 'scripts/install-user.mjs');
const skill = join(root, 'skills/manage-dev-knowledge');
function run(home, ...args) {
  return spawnSync(process.execPath, [installer, ...args], {
    encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home, CODEX_HOME: join(home, '.codex') },
  });
}
test('관리 Skill 설치는 로컬 MCP 설정 없이 링크만 생성하고 재실행해도 보존한다', () => {
  const home = mkdtempSync(join(tmpdir(), 'my-context-manage-'));
  try {
    const target = join(home, '.agents/skills/manage-dev-knowledge');
    assert.equal(run(home, '--check').status, 0);
    const first = run(home);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(lstatSync(target).isSymbolicLink(), true);
    assert.equal(realpathSync(target), realpathSync(skill));
    assert.equal(run(home).status, 0);
    assert.equal(readFileSync(join(target, 'SKILL.md'), 'utf8').includes('개인 개발 지식 관리'), true);
    assert.equal(run(home, '--force').status === 0, false);
    assert.equal(run(home, '--check').status, 0);
    assert.equal(existsSync(join(home, '.codex/config.toml')), false);
  } finally { rmSync(home, { recursive: true, force: true }); }
});
function requireNoConfig(home) {
  const { existsSync } = requireNodeFs();
  return !existsSync(join(home, '.codex/config.toml'));
}
function requireNodeFs() { return { existsSync: (path) => { try { lstatSync(path); return true; } catch (e) { if(e.code==='ENOENT') return false; throw e; } } }; }
test('기존 관리 Skill 경로 충돌 시 사용자 파일을 보존한다', () => {
  const home = mkdtempSync(join(tmpdir(), 'my-context-manage-'));
  try {
    const target = join(home, '.agents/skills/manage-dev-knowledge');
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'SKILL.md'), 'existing user content');
    const result = run(home);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(join(target, 'SKILL.md'), 'utf8'), 'existing user content');
  } finally { rmSync(home, { recursive: true, force: true }); }
});

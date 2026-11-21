import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, lstatSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const entry = join(root, 'scripts/install-asset-usage.mjs');
const targets = ['.codex/AGENTS.md', '.pi/agent/AGENTS.md', '.claude/CLAUDE.md'];
const policy = readFileSync(join(root, 'policies/asset-usage.md'), 'utf8').trimEnd();
function run(args, home) {
  const env = { ...process.env, HOME: home };
  delete env.CODEX_HOME;
  delete env.PI_CODING_AGENT_DIR;
  delete env.CLAUDE_CONFIG_DIR;
  return spawnSync(process.execPath, [entry, args], { env, cwd: root, encoding: 'utf8' });
}
function fixture(fn) {
  const home = mkdtempSync(join(tmpdir(), 'my-context-policy-'));
  try { fn(home); } finally { rmSync(home, { recursive: true, force: true }); }
}
function read(home, path) { return readFileSync(join(home, path), 'utf8'); }

test('기본 조회 모드는 비활성이고 확인은 사용자 지침을 수정하지 않는다', () => fixture((home) => {
  const r = run('--check', home);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).results.length, 3);
  assert.ok(JSON.parse(r.stdout).results.every((x) => x.status === 'disabled'));
  for (const target of targets) {
    assert.throws(() => read(home, target), { code: 'ENOENT' });
  }
}));

test('명시적 활성화 시 세 환경에 같은 공통 정책을 추가하고 반복 실행은 중복되지 않는다', () => fixture((home) => {
  const codex = join(home, targets[0]);
  mkdirSync(join(home, '.codex'), { recursive: true });
  writeFileSync(codex, '# Existing user instructions\n\nKeep this.\n');
  const first = run('--enable', home);
  assert.equal(first.status, 0, first.stderr);
  for (const target of targets) {
    const text = read(home, target);
    assert.ok(text.includes(policy), target);
    assert.equal(text.split('<!-- my-context:asset-usage:start -->').length, 2);
  }
  assert.match(read(home, targets[0]), /Keep this/);
  assert.equal(run('--check', home).status, 0);
  assert.ok(JSON.parse(run('--check', home).stdout).results.every((x) => x.status === 'enabled'));
  const before = targets.map((p) => read(home, p));
  const second = run('--enable', home);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(targets.map((p) => read(home, p)), before);
  assert.deepEqual(JSON.parse(second.stdout).changed, []);
  const disabled = run('--disable', home);
  assert.equal(disabled.status, 0, disabled.stderr);
  for (const target of targets) {
    assert.doesNotMatch(read(home, target), /my-context:asset-usage:start/);
  }
  assert.equal(read(home, targets[0]), ['# Existing user instructions', '', 'Keep this.', ''].join(String.fromCharCode(10)));
}));

test('손상된 마커를 발견하면 다른 환경도 일부 활성화하지 않는다', () => fixture((home) => {
  mkdirSync(join(home, '.pi/agent'), { recursive: true });
  writeFileSync(join(home, targets[1]), 'original\n<!-- my-context:asset-usage:start -->');
  const r = run('--enable', home);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.throws(() => read(home, targets[0]), { code: 'ENOENT' });
  assert.throws(() => read(home, targets[2]), { code: 'ENOENT' });
}));

test('기존 파일의 심볼릭 링크는 안전하게 거부한다', () => fixture((home) => {
  mkdirSync(join(home, '.codex'), { recursive: true });
  // broken symlink도 거부해야 한다
  symlinkSync(join(home, 'missing'), join(home, targets[0]));
  const r = run('--enable', home);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.ok(lstatSync(join(home, targets[0])).isSymbolicLink());
  assert.throws(() => read(home, targets[2]), { code: 'ENOENT' });
}));

test('Skill 독립 평가 자료는 비활성·활성·정정·MCP 누락 시나리오를 모두 포함한다', () => {
  const cases = JSON.parse(readFileSync(join(root, 'test/fixtures/asset-use-scenarios.json'), 'utf8'));
  const expected = ['requirements-without-workflow', 'architecture-without-workflow', 'parallel-without-workflow', 'small-change', 'disabled-by-default', 'no-mcp', 'user-correction', 'read-only'];
  assert.deepEqual(cases.map((x) => x.id).sort(), expected.sort());
  for (const scenario of cases) {
    assert.ok(typeof scenario.mode === 'string' && scenario.mode);
    assert.ok(scenario.request && scenario.expected.length && scenario.forbidden.length);
  }
  // Fixture 유효성과 실제 모델 행동은 다른 검증 단계다.
});

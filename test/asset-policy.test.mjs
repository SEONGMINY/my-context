import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, lstatSync, symlinkSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const entry = join(root, 'scripts/install-asset-usage.mjs');
const targets = ['.codex/AGENTS.md', '.pi/agent/AGENTS.md', '.claude/CLAUDE.md'];
const policy = readFileSync(join(root, 'policies/asset-usage.md'), 'utf8').trimEnd();
function run(arg, home, injectFailure = false) {
  const env = { ...process.env, HOME: home };
  delete env.CODEX_HOME; delete env.PI_CODING_AGENT_DIR; delete env.CLAUDE_CONFIG_DIR;
  const args = injectFailure
    ? ['--require', join(root, 'test/fixtures/fail-second-policy-write.cjs'), entry, arg]
    : [entry, arg];
  return spawnSync(process.execPath, args, { env, cwd: root, encoding: 'utf8' });
}
function fixture(callback) {
  const home = mkdtempSync(join(tmpdir(), 'my-context-policy-'));
  try { callback(home); } finally { rmSync(home, { recursive: true, force: true }); }
}
function set(home, path, value) {
  mkdirSync(join(home, path, '..'), { recursive: true });
  writeFileSync(join(home, path), value);
}
function read(home, path) { return readFileSync(join(home, path), 'utf8'); }

test('새 환경은 설치 전 검사를 하더라도 사용자 지침이 변경되지 않는다', () => fixture((home) => {
  const result = run('--check', home);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).results.every(({ status }) => status === 'missing'));
  assert.ok(targets.every((path) => !existsSync(join(home, path))));
}));

test('자동 참고 초기 설정은 기존 지침을 유지하고 재실행해도 중복되지 않는다', () => fixture((home) => {
  const originals = ['# Existing instructions\n\nKeep this.\n', 'Original without newline', ''];
  originals.forEach((source, i) => set(home, targets[i], source));
  assert.equal(run('--install', home).status, 0);
  targets.forEach((path, i) => {
    assert.ok(read(home, path).startsWith(originals[i]));
    assert.ok(read(home, path).includes(policy));
    assert.equal(read(home, path).split('<!-- my-context:asset-usage:start -->').length, 2);
  });
  assert.ok(JSON.parse(run('--check', home).stdout).results.every(({ status }) => status === 'current'));
  const first = targets.map((path) => read(home, path));
  const repeated = run('--install', home);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.deepEqual(JSON.parse(repeated.stdout).changed, []);
  assert.deepEqual(targets.map((path) => read(home, path)), first);
  assert.notEqual(run('--enable', home).status, 0);
  assert.notEqual(run('--disable', home).status, 0);
}));

test('설치 뒤 관리 구간 외부에 작성한 사용자 지침도 유지된다', () => fixture((home) => {
  assert.equal(run('--install', home).status, 0);
  const path = targets[0];
  writeFileSync(join(home, path), read(home, path) + 'Extra user instructions\n');
  assert.equal(run('--install', home).status, 0);
  assert.match(read(home, path), /Extra user instructions\n$/);
}));

test('이전 정상 관리 구간은 갱신하지만 잘못된 메타데이터는 보존하며 거부한다', () => fixture((home) => {
  assert.equal(run('--install', home).status, 0);
  const path = targets[0], current = read(home, path);
  const oldBody = policy.replace('자율적으로', '조건부로');
  const older = current.replace(policy, oldBody).replace(/sha256=[a-f0-9]{64}/,
    'sha256=' + createHash('sha256').update(oldBody).digest('hex'));
  writeFileSync(join(home, path), older);
  assert.equal(JSON.parse(run('--check', home).stdout).results[0].status, 'outdated');
  assert.equal(read(home, path), older);
  assert.equal(run('--install', home).status, 0);
  assert.equal(read(home, path), current);
  writeFileSync(join(home, path), current.replace('created=1', 'created=invalid'));
  assert.notEqual(run('--install', home).status, 0);
}));

test('관리 구간을 사용자가 변경했다면 다른 파일도 수정하지 않는다', () => fixture((home) => {
  assert.equal(run('--install', home).status, 0);
  const second = read(home, targets[1]);
  writeFileSync(join(home, targets[0]), read(home, targets[0]).replace('자동 참고', '수동 참고'));
  for (const arg of ['--check', '--install']) {
    const result = run(arg, home);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Modified or unrecognized/);
    assert.equal(read(home, targets[1]), second);
  }
}));

test('손상된 마커나 기존 심볼릭 링크는 다른 대상 설치 전에 거부한다', () => fixture((home) => {
  set(home, targets[1], 'original\n<!-- my-context:asset-usage:start -->');
  assert.notEqual(run('--install', home).status, 0);
  assert.equal(existsSync(join(home, targets[0])), false);
  assert.equal(existsSync(join(home, targets[2])), false);
  rmSync(join(home, targets[1]));
  mkdirSync(join(home, '.codex'), { recursive: true });
  symlinkSync(join(home, 'missing'), join(home, targets[0]));
  assert.notEqual(run('--install', home).status, 0);
  assert.ok(lstatSync(join(home, targets[0])).isSymbolicLink());
}));

test('구분 문자 훼손을 확인 및 설치에서 모두 거부한다', () => fixture((home) => {
  set(home, targets[0], '# Existing\n');
  assert.equal(run('--install', home).status, 0);
  const file = targets[0];
  const modified = read(home, file).replace('\n\n<!-- my-context:asset-usage:start -->',
    '<!-- my-context:asset-usage:start -->');
  writeFileSync(join(home, file), modified);
  for (const arg of ['--check', '--install']) {
    assert.notEqual(run(arg, home).status, 0);
    assert.equal(read(home, file), modified);
  }
}));

test('중간 쓰기 실패는 기존 사용자 파일을 복구한다', () => fixture((home) => {
  const originals = ['# Codex\n', '# Pi\n', '# Claude\n'];
  originals.forEach((source, i) => set(home, targets[i], source));
  const failed = run('--install', home, true);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /Injected second-target write failure/);
  targets.forEach((path, i) => assert.equal(read(home, path), originals[i]));
  assert.ok(JSON.parse(run('--check', home).stdout).results.every(({ status }) => status === 'missing'));
}));

test('중간 쓰기 실패는 새로 생성한 사용자 파일도 정리한다', () => fixture((home) => {
  const failed = run('--install', home, true);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /Injected second-target write failure/);
  assert.ok(targets.every((path) => !existsSync(join(home, path))));
}));

test('Workflow와 인사이트 Skill은 기본 자율 선택과 읽기 권한 경계를 명시한다', () => {
  const workflow = readFileSync(join(root, 'skills/development-workflow/SKILL.md'), 'utf8');
  const insights = readFileSync(join(root, 'skills/extract-development-insights/SKILL.md'), 'utf8');
  assert.match(workflow.split('---', 3)[1], /별도의 자동 활용 ON\/OFF 동의/);
  assert.match(workflow, /현재 작업에서 my-context 활용을 금지/);
  assert.match(insights, /추가 개인 대화·경험 자료의 열람 동의/);
  assert.match(policy, /별도의 ON\/OFF 활성화/);
  assert.match(policy, /변경은 별도 사용자 승인/);
});

test('에이전트 자동 참고 행동 평가 시나리오는 필요한 경계를 포함한다', () => {
  const scenarios = JSON.parse(readFileSync(join(root, 'test/fixtures/asset-use-scenarios.json'), 'utf8'));
  const expected = ['automatic-by-default', 'small-change', 'explicit-exclusion',
    'legacy-policy-upgrade', 'no-mcp', 'sensitive-context', 'read-only'];
  assert.ok(expected.every((id) => scenarios.some((scenario) => scenario.id === id)));
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, scenarios.length);
  assert.ok(scenarios.every((scenario) => scenario.request && scenario.expected.length && scenario.forbidden.length));
});

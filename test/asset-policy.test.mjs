import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, lstatSync, symlinkSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const entry = join(root, 'scripts/install-asset-usage.mjs');
const targets = ['.codex/AGENTS.md', '.pi/agent/AGENTS.md', '.claude/CLAUDE.md'];
const policy = readFileSync(join(root, 'policies/asset-usage.md'), 'utf8').trimEnd();

function run(arg, home) {
  const env = { ...process.env, HOME: home };
  delete env.CODEX_HOME;
  delete env.PI_CODING_AGENT_DIR;
  delete env.CLAUDE_CONFIG_DIR;
  return spawnSync(process.execPath, [entry, arg], { env, cwd: root, encoding: 'utf8' });
}
function fixture(fn) {
  const home = mkdtempSync(join(tmpdir(), 'my-context-policy-'));
  try { fn(home); } finally { rmSync(home, { recursive: true, force: true }); }
}
function read(home, path) { return readFileSync(join(home, path), 'utf8'); }
function set(home, path, value) {
  mkdirSync(join(home, path, '..'), { recursive: true });
  writeFileSync(join(home, path), value);
}

test('기본 조회는 비활성이고 상태 확인은 지침을 만들지 않는다', () => fixture((home) => {
  const r = run('--check', home);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout).results.every((x) => x.status === 'disabled'));
  for (const path of targets) assert.equal(existsSync(join(home, path)), false);
}));

test('활성화·재활성화·비활성화는 기존 파일을 정확히 복원하고 생성한 파일은 제거한다', () => fixture((home) => {
  const originals = [
    '# Existing instructions\n\nKeep this.\n',
    'Original without a trailing newline',
    '',
  ];
  originals.forEach((source, i) => set(home, targets[i], source));
  const first = run('--enable', home);
  assert.equal(first.status, 0, first.stderr);
  for (const path of targets) {
    assert.ok(read(home, path).includes(policy));
    assert.equal(read(home, path).split('<!-- my-context:asset-usage:start -->').length, 2);
  }
  assert.ok(JSON.parse(run('--check', home).stdout).results.every((x) => x.status === 'enabled'));
  const before = targets.map((path) => read(home, path));
  const repeated = run('--enable', home);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.deepEqual(targets.map((path) => read(home, path)), before);
  assert.deepEqual(JSON.parse(repeated.stdout).changed, []);
  const disabled = run('--disable', home);
  assert.equal(disabled.status, 0, disabled.stderr);
  targets.forEach((path, i) => assert.equal(read(home, path), originals[i], path));
}));

test('새로 만든 파일만 삭제하고, 사용자가 밖에 내용을 추가했다면 남긴다', () => fixture((home) => {
  assert.equal(run('--enable', home).status, 0);
  assert.equal(run('--disable', home).status, 0);
  for (const path of targets) assert.equal(existsSync(join(home, path)), false, path);

  assert.equal(run('--enable', home).status, 0);
  const codex = join(home, targets[0]);
  writeFileSync(codex, read(home, targets[0]) + 'My new instructions\n');
  assert.equal(run('--disable', home).status, 0);
  assert.equal(read(home, targets[0]), 'My new instructions\n');
  assert.equal(existsSync(join(home, targets[1])), false);
  assert.equal(existsSync(join(home, targets[2])), false);
}));

test('정책 내부를 수정하면 활성화·비활성화를 거부하고 다른 파일도 보존한다', () => fixture((home) => {
  assert.equal(run('--enable', home).status, 0);
  const first = targets[0], second = targets[1];
  const before = read(home, second);
  writeFileSync(join(home, first), read(home, first).replace('선택적', '강제적'));
  for (const operation of ['--enable', '--disable']) {
    const r = run(operation, home);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /Modified or unrecognized/);
    assert.equal(read(home, second), before);
  }
}));

test('손상된 마커와 심볼릭 링크는 다른 파일을 수정하기 전에 거부한다', () => fixture((home) => {
  set(home, targets[1], 'original\n<!-- my-context:asset-usage:start -->');
  const r = run('--enable', home);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(existsSync(join(home, targets[0])), false);
  assert.equal(existsSync(join(home, targets[2])), false);
  rmSync(join(home, targets[1]));
  mkdirSync(join(home, '.codex'), { recursive: true });
  symlinkSync(join(home, 'missing'), join(home, targets[0]));
  const symlink = run('--enable', home);
  assert.equal(symlink.status, 1, symlink.stdout + symlink.stderr);
  assert.ok(lstatSync(join(home, targets[0])).isSymbolicLink());
  assert.equal(existsSync(join(home, targets[2])), false);
}));

test('정책 내용 변경은 정상 설치본만 갱신하고 불명확한 메타데이터는 중단한다', () => fixture((home) => {
  assert.equal(run('--enable', home).status, 0);
  const p = targets[0], current = read(home, p);
  // The hash protects previous contents. A different valid hash with older body can be updated.
  const oldBody = policy.replace('선택적', '조건적인');
  const hash = requireDigest(oldBody);
  const older = current.replace(policy, oldBody).replace(/sha256=[a-f0-9]{64}/, 'sha256=' + hash);
  writeFileSync(join(home, p), older);
  assert.equal(JSON.parse(run('--check', home).stdout).results[0].status, 'outdated');
  assert.equal(run('--enable', home).status, 0);
  assert.equal(read(home, p), current);
  writeFileSync(join(home, p), read(home, p).replace('created=1', 'created=invalid'));
  assert.equal(run('--enable', home).status, 1);
}));
function requireDigest(value) {
  return createHash('sha256').update(value).digest('hex');
}

test('Skill 독립 행동 평가 자료는 비활성·활성·정정·MCP 누락을 포함한다', () => {
  const scenarios = JSON.parse(readFileSync(join(root, 'test/fixtures/asset-use-scenarios.json'), 'utf8'));
  const expected = ['requirements-without-workflow', 'architecture-without-workflow', 'parallel-without-workflow', 'small-change', 'disabled-by-default', 'no-mcp', 'user-correction', 'read-only'];
  assert.deepEqual(scenarios.map(({ id }) => id).sort(), expected.sort());
  assert.ok(scenarios.every((scenario) => scenario.request && scenario.expected.length && scenario.forbidden.length));
});

test('사용자가 마커 외부의 구분 문자를 바꾸면 확인·수정·제거 모두 중단한다', () => fixture((home) => {
  set(home, targets[0], '# Existing\n');
  assert.equal(run('--enable', home).status, 0);
  const file = targets[0];
  const modified = read(home, file).replace('\n<!-- my-context:asset-usage:start -->', '<!-- my-context:asset-usage:start -->');
  writeFileSync(join(home, file), modified);
  for (const action of ['--check', '--enable', '--disable']) {
    const result = run(action, home);
    assert.equal(result.status, 1, action + ' ' + result.stdout + result.stderr);
    assert.equal(read(home, file), modified);
  }
});

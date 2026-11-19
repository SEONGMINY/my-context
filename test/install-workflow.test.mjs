import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPlannedSkillLinks } from '../scripts/install-workflow-links.mjs';

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
  const home = fs.mkdtempSync(join(tmpdir(), 'my-context-workflow-test-'));
  try {
    await callback(home);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

function failOnSecondLink() {
  let attempts = 0;
  return {
    ...fs,
    symlinkSync(...args) {
      attempts += 1;
      if (attempts === 2) {
        const error = new Error('Second link is not writable');
        error.code = 'EACCES';
        throw error;
      }
      return fs.symlinkSync(...args);
    },
  };
}

test('설치 전 검사만 실행하면 > 설치 경로를 만들지 않고 필요한 작업을 알려준다', () => withHome((home) => {
  // given: 두 에이전트의 설치 경로가 없는 홈 디렉터리
  // when: 읽기 전용 사전 검사를 실행
  const result = run(home, '--check');

  // then: 두 경로가 설치 대상으로 표시되고 파일은 생성되지 않음
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).skills.map(({ action }) => action), ['link', 'link']);
  assert.equal(fs.existsSync(join(home, '.agents')), false);
  assert.equal(fs.existsSync(join(home, '.claude')), false);
}));

test('두 에이전트에 설치한 후 다시 설치하면 > 같은 원본을 유지하고 중복 설치하지 않는다', () => withHome((home) => {
  // given: 설치되지 않은 두 경로
  // when: 설치 후 다시 설치
  const first = run(home);
  const second = run(home);
  const check = run(home, '--check');

  // then: 양쪽 모두 같은 Skill 원본을 가리키고 두 번째는 keep
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(check.status, 0, check.stderr);
  for (const target of [common(home), claude(home)]) {
    assert.equal(fs.lstatSync(target).isSymbolicLink(), true);
    assert.equal(fs.realpathSync(target), fs.realpathSync(skill));
  }
  assert.deepEqual(JSON.parse(second.stdout).skills.map(({ action }) => action), ['keep', 'keep']);
  assert.deepEqual(JSON.parse(check.stdout).skills.map(({ action }) => action), ['keep', 'keep']);
}));

test('두 번째 설치 경로에 기존 Skill이 있으면 > 변경하지 않고 첫 번째 설치도 시작하지 않는다', () => withHome((home) => {
  // given: Claude Code에 사용자가 만든 기존 Skill이 있음
  const existing = claude(home);
  fs.mkdirSync(existing, { recursive: true });
  fs.writeFileSync(join(existing, 'SKILL.md'), 'unrelated skill');

  // when: 공통 Workflow 설치를 시도
  const result = run(home);

  // then: 기존 Skill을 보존하고 다른 설치 경로에도 영향을 주지 않음
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Existing skill preserved/);
  assert.equal(fs.readFileSync(join(existing, 'SKILL.md'), 'utf8'), 'unrelated skill');
  assert.equal(fs.existsSync(join(home, '.agents')), false);
}));

test('첫 번째 설치 경로에 기존 파일이 있으면 > 원본을 덮어쓰지 않고 두 번째 설치도 하지 않는다', () => withHome((home) => {
  // given: Codex/Pi 설치 대상에 기존 파일이 있음
  const existing = common(home);
  fs.mkdirSync(join(home, '.agents/skills'), { recursive: true });
  fs.writeFileSync(existing, 'existing user file');

  // when: 설치를 시도
  const result = run(home);

  // then: 충돌을 알리고 기존 파일을 보존
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Existing skill preserved/);
  assert.equal(fs.readFileSync(existing, 'utf8'), 'existing user file');
  assert.equal(fs.existsSync(join(home, '.claude')), false);
}));

test('깨진 심볼릭 링크가 설치 대상에 있으면 > 기존 링크를 보존하고 설치를 시작하지 않는다', () => withHome((home) => {
  // given: Claude Code의 설치 대상에 깨진 심볼릭 링크가 있음
  const existing = claude(home);
  fs.mkdirSync(join(home, '.claude/skills'), { recursive: true });
  fs.symlinkSync(join(home, 'missing-skill'), existing, 'dir');

  // when: 설치를 시도
  const result = run(home);

  // then: 심볼릭 링크가 남고 첫 번째 경로에도 설치되지 않음
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Existing skill preserved/);
  assert.equal(fs.lstatSync(existing).isSymbolicLink(), true);
  assert.equal(fs.existsSync(join(home, '.agents')), false);
}));

test('설치에 지원하지 않는 옵션을 전달하면 > 설치 경로를 변경하지 않는다', () => withHome((home) => {
  // given: 설치되지 않은 홈 디렉터리
  // when: 허용하지 않는 옵션 전달
  const result = run(home, '--force');

  // then: 잘못된 사용법을 알리고 설치하지 않음
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
  assert.equal(fs.existsSync(join(home, '.agents')), false);
}));

test('설치한 Skill을 실제 경로에서 읽으면 > 두 환경 모두 본문과 상대 참조 파일이 동일하다', () => withHome((home) => {
  // given: Skill 원본과 계약 파일이 있음
  // when: 두 환경에 설치
  const result = run(home);

  // then: 설치 경로에서도 동일한 본문과 참조 계약을 읽을 수 있음
  assert.equal(result.status, 0, result.stderr);
  const sourceSkill = fs.readFileSync(join(skill, 'SKILL.md'), 'utf8');
  const sourceContract = fs.readFileSync(join(skill, 'references/contracts.md'), 'utf8');
  for (const target of [common(home), claude(home)]) {
    assert.equal(fs.readFileSync(join(target, 'SKILL.md'), 'utf8'), sourceSkill);
    assert.equal(fs.readFileSync(join(target, 'references/contracts.md'), 'utf8'), sourceContract);
  }
}));

test('두 번째 링크 생성이 실패하면 > 첫 번째 링크와 이번 설치에서 생성한 빈 디렉터리를 되돌린다', () => withHome((home) => {
  // given: 양쪽 설치 경로가 비어 있고 두 번째 링크 생성만 실패하는 파일 시스템
  const plan = [common(home), claude(home)].map((path) => ({ path, action: 'link' }));

  // when: 일부 설치 이후 오류가 발생
  assert.throws(() => applyPlannedSkillLinks(plan, skill, failOnSecondLink()), { code: 'EACCES' });

  // then: 부분 설치를 남기지 않음
  assert.equal(fs.existsSync(common(home)), false);
  assert.equal(fs.existsSync(claude(home)), false);
  assert.equal(fs.existsSync(join(home, '.agents')), false);
  assert.equal(fs.existsSync(join(home, '.claude')), false);
}));

test('기존 링크를 보존한 채 추가 설치가 실패하면 > 이전에 설치한 Skill은 삭제하지 않는다', () => withHome((home) => {
  // given: Codex/Pi에 정상적으로 설치된 기존 링크
  fs.mkdirSync(join(home, '.agents/skills'), { recursive: true });
  fs.symlinkSync(skill, common(home), 'dir');
  const plan = [
    { path: common(home), action: 'keep' },
    { path: claude(home), action: 'link' },
  ];
  const denied = {
    ...fs,
    symlinkSync() {
      const error = new Error('Cannot create link');
      error.code = 'EACCES';
      throw error;
    },
  };

  // when: 새 경로 설치에 실패
  assert.throws(() => applyPlannedSkillLinks(plan, skill, denied), { code: 'EACCES' });

  // then: 이전 링크는 유지되고 새 경로의 빈 디렉터리는 정리됨
  assert.equal(fs.realpathSync(common(home)), fs.realpathSync(skill));
  assert.equal(fs.existsSync(join(home, '.claude')), false);
}));

test('설치 실패 후 링크 정리에도 실패하면 > 부분 설치를 숨기지 않고 오류를 보고한다', () => withHome((home) => {
  // given: 두 번째 링크와 첫 번째 링크 삭제가 모두 실패하는 파일 시스템
  const plan = [common(home), claude(home)].map((path) => ({ path, action: 'link' }));
  const failingFs = {
    ...failOnSecondLink(),
    unlinkSync() {
      const error = new Error('Cannot remove link');
      error.code = 'EACCES';
      throw error;
    },
  };

  // when: 설치에 실패하고 롤백도 실패
  const failure = assert.throws(() => applyPlannedSkillLinks(plan, skill, failingFs));

  // then: 남은 부분 설치를 명시적으로 보고하고 기존 파일을 임의로 삭제하지 않음
  assert.ok(failure instanceof AggregateError);
  assert.match(failure.message, /정리하지 못했습니다/);
  assert.equal(fs.lstatSync(common(home)).isSymbolicLink(), true);
}));

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

test('계획만 요청한 경우 실행 금지·계획과 실행을 함께 요청한 경우 재승인 최소화', () => {
  const workflow = read('skills/development-workflow/SKILL.md');
  assert.match(workflow, /계획만.*요청/);
  assert.match(workflow, /계획과 실행을 함께 명시/);
  assert.match(workflow, /코드 수정·커밋·푸시·배포/);
  assert.match(workflow, /별도 승인이 필요한 행위/);
});

test('로컬 설치 없이 MCP에 조회 가능한 공통 절차·관리 Skill을 명시적으로 게시한다', () => {
  const slugs = JSON.parse(read('publish-skills.json'));
  for (const slug of ['development-workflow', 'domain-storytelling', 'extract-development-insights', 'manage-dev-knowledge']) {
    assert.ok(slugs.includes(slug), slug);
    assert.ok(existsSync(join(root, 'skills', slug, 'SKILL.md')));
  }
  assert.equal(new Set(slugs).size, slugs.length);
  const manager = read('skills/manage-dev-knowledge/SKILL.md');
  assert.match(manager, /읽기 전용 MCP/);
  assert.match(manager, /명시적 승인/);
  assert.match(manager, /Git.*권한/);
});

test('설치 명령 제거 후 원본 Workflow·무결성 테스트 명령은 유지한다', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const key of ['setup:agent', 'setup:agent:check', 'install:user', 'install:workflow']) {
    assert.equal(pkg.scripts[key], undefined, key);
  }
  assert.ok(pkg.scripts['test:workflow']);
  assert.ok(pkg.scripts['test:integrity']);
  assert.match(read('skills/development-workflow/SKILL.md'), /G1 Contract/);
  assert.match(read('skills/development-workflow/SKILL.md'), /G3 Verification/);
});

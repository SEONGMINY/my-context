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

test('공통 절차·관리 Skill을 MCP 게시 목록에 등록한다', () => {
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

test('Workflow 원본과 검증 명령의 계약을 유지한다', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.scripts['test:workflow']);
  assert.ok(pkg.scripts['test:integrity']);
  assert.match(read('skills/development-workflow/SKILL.md'), /G1 Contract/);
  assert.match(read('skills/development-workflow/SKILL.md'), /G3 Verification/);
});

test('프로덕트 이해와 문서 검토는 독립적이며 읽기 전용 계약을 가진다', () => {
  const slugs = JSON.parse(read('publish-skills.json'));
  for (const slug of ['product-understanding', 'documentation-review']) {
    assert.ok(slugs.includes(slug), slug);
    assert.ok(existsSync(join(root, 'skills', slug, 'SKILL.md')), slug);
    assert.match(read('skills/' + slug + '/SKILL.md'), new RegExp('name: ' + slug));
  }
  const product = read('skills/product-understanding/SKILL.md');
  const documentation = read('skills/documentation-review/SKILL.md');
  assert.match(product, /목적과 범위/);
  assert.match(product, /구조와 책임/);
  assert.match(product, /문서의 불일치·불필요·누락을 감사하는 작업이 아니다/);
  assert.match(documentation, /불일치/);
  assert.match(documentation, /불필요/);
  assert.match(documentation, /누락/);
  assert.match(documentation, /읽기 전용/);
  assert.match(documentation, /문서·코드 수정/);
  assert.match(documentation, /독립 사용도 가능/);
});


test('세션 시작용 두 Skill은 독립적 읽기 전용이며 자동 실행을 보장하지 않는다', () => {
  const product = read('skills/product-understanding/SKILL.md');
  const documentation = read('skills/documentation-review/SKILL.md');
  const guide = read('README.md');
  const e2e = read('test/workflow-evaluation.md');
  assert.match(product, /이 Skill은 읽기 전용/);
  assert.match(product, /제품 이해를 먼저 수행/);
  assert.match(documentation, /두 Skill을 함께 요청받았다면 제품 이해 결과/);
  assert.match(documentation, /독립적으로 수행/);
  assert.match(guide, /프로덕트 이해 → 문서 검토/);
  assert.match(guide, /자동 실행을 보장하지 않으므로/);
  assert.match(e2e, /전체 코드·문서 반복 탐색/);
  assert.match(e2e, /NOT_RUN/);
});

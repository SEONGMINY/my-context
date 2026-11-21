import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

test('인사이트 추출 Skill을 게시하면 > 독립적인 진입점과 읽기 전용 경계를 제공한다', () => {
  const skill = read('skills/extract-development-insights/SKILL.md');
  const published = JSON.parse(read('publish-skills.json'));
  assert.match(skill, /^---\n[\s\S]*?name: extract-development-insights\n[\s\S]*?description: /);
  assert.ok(published.includes('extract-development-insights'));
  assert.match(skill, /읽기 전용/);
  assert.match(skill, /관리|manage-dev-knowledge/);
  assert.match(skill, /사용자의.*발언|사용자.*원문/);
});

test('네 가지 원칙은 > 독립적으로 조회되며 특정 개발 Skill과 결합하지 않는다', () => {
  const cases = [
    ['implementation-strategy', 'Implementation Strategy'],
    ['execution-strategy', 'Execution Strategy'],
    ['roadmap-planning', 'Roadmap Planning'],
    ['context-aware-reasoning', 'Context-aware Reasoning'],
  ];
  for (const [slug, title] of cases) {
    const dir = 'content/personal/lookup-' + slug;
    const entry = read(dir + '/SKILL.md');
    const knowledge = read(dir + '/knowledge.md');
    assert.match(entry, new RegExp('name: lookup-' + slug + '\\n'));
    assert.match(entry, /description: /);
    assert.match(entry, /knowledge.md/);
    assert.match(knowledge, new RegExp('# ' + title));
    assert.match(knowledge, /판단 원칙/);
  }
  const workflow = read('skills/development-workflow/SKILL.md');
  assert.doesNotMatch(workflow, /lookup-development-principles/);
  assert.match(read('policies/asset-usage.md'), /특정 Skill의 호출을 전제로 하지 않는다/);
  assert.match(workflow, /사용자가 별도로 활성화한/);
});

test('인사이트 평가 사례를 유지하면 > 발언 오인·불완전한 이력·중복·무단 저장 위험을 다룬다', () => {
  const scenarios = JSON.parse(read('test/fixtures/insight-scenarios.json'));
  const required = [
    'user-versus-assistant', 'incomplete-history', 'implementation-judgment',
    'small-one-off', 'overlap-with-current', 'read-only-private',
  ];
  assert.deepEqual(scenarios.map(({ id }) => id).sort(), required.sort());
  for (const scenario of scenarios) {
    assert.match(scenario.id, /^[a-z][a-z0-9-]+$/);
    assert.ok(typeof scenario.request === 'string' && scenario.request.trim(), scenario.id);
    for (const field of ['expected', 'forbidden']) {
      assert.ok(Array.isArray(scenario[field]) && scenario[field].length, scenario.id + ': ' + field);
      assert.ok(scenario[field].every((value) => typeof value === 'string' && value.trim()), scenario.id + ': ' + field);
    }
  }
  // 정적 검사는 Fixture의 존재와 구조만 검증한다. 실제 에이전트 행동 평가가 아니다.
});

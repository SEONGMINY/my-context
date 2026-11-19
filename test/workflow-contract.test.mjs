import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

test('공통 Skill을 게시 대상으로 등록하면 > 이름과 참조 계약 파일을 확인할 수 있다', () => {
  // given: 실제로 배포할 Skill과 게시 목록
  const skill = read('skills/development-workflow/SKILL.md');
  const manifest = JSON.parse(read('publish-skills.json'));

  // when: Skill 메타데이터와 참조 경로를 확인
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
  const reference = skill.match(/\]\((references\/[^)#]+\.md)\)/);

  // then: 게시할 Skill은 올바른 이름·설명과 실제 계약을 가진다
  assert.ok(frontmatter, 'Skill 메타데이터가 있어야 한다');
  assert.match(frontmatter[1], /^name: development-workflow$/m);
  assert.match(frontmatter[1], /^description: "?\S.+/m);
  assert.ok(reference, '공통 계약의 상대 참조가 있어야 한다');
  assert.ok(read('skills/development-workflow/' + reference[1]).trim());
  assert.ok(manifest.includes('development-workflow'));
});

test('관리 전용 Skill을 공개 게시할 때 > 게시 대상에서 제외한다', () => {
  // given: 배포 목록에 공통 Skill을 게시
  const manifest = JSON.parse(read('publish-skills.json'));

  // when: 관리 전용 Skill 노출 여부 확인
  // then: 사용자 개인 지식 관리 Skill은 게시하지 않음
  assert.equal(manifest.includes('manage-dev-knowledge'), false);
});

test('방법론의 공통 Gate를 탐색할 때 > 지침과 계약에서 같은 식별자를 찾는다', () => {
  // given: 공통 Skill과 의미적 계약
  const skill = read('skills/development-workflow/SKILL.md');
  const contracts = read('skills/development-workflow/references/contracts.md');

  // when + then: 안정적인 Gate 식별자는 두 문서에서 모두 확인된다
  // 정적 참조 무결성 검사이며 실제 에이전트가 Gate를 준수한다는 증거는 아니다.
  for (const gate of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']) {
    assert.match(skill, new RegExp('\\b' + gate + '\\b'));
    assert.match(contracts, new RegExp('\\b' + gate + '\\b'));
  }
});

test('대표 행동 평가 자료를 유지하면 > 핵심 위험 사례가 누락되거나 중복되지 않는다', () => {
  // given: 실제 모델에 실행할 평가 자료(여기서는 실행하지 않음)
  const scenarios = JSON.parse(read('test/fixtures/workflow-scenarios.json'));
  const required = new Map([
    ['small-fix', 'lightweight'],
    ['ambiguous-contract', 'contract'],
    ['project-priority', 'contract'],
    ['parallel-plan', 'planning'],
    ['graph-cycle', 'planning'],
    ['dropped-dependency', 'planning'],
    ['unverified-result', 'verification'],
    ['stale-evidence', 'verification'],
    ['decision-revision', 'change'],
    ['handoff', 'handoff'],
    ['personal-knowledge', 'boundary'],
    ['skill-regression', 'methodology'],
  ]);

  // when: 실제 사례와 필수 사례를 비교
  const actual = new Map(scenarios.map(({ id, category }) => [id, category]));

  // then: 중요한 안전·회귀 사례가 빠지지 않고 평가 기준이 비어 있지 않다
  assert.equal(actual.size, scenarios.length, '시나리오 ID가 중복되면 안 된다');
  for (const [id, category] of required) {
    assert.equal(actual.get(id), category, id + ' 사례가 누락되거나 범주가 변경됨');
  }
  for (const scenario of scenarios) {
    assert.match(scenario.id, /^[a-z][a-z0-9-]+$/);
    assert.ok(typeof scenario.request === 'string' && scenario.request.trim(), scenario.id);
    for (const field of ['expected', 'forbidden']) {
      assert.ok(Array.isArray(scenario[field]) && scenario[field].length > 0, scenario.id + ': ' + field);
      assert.ok(scenario[field].every((text) => typeof text === 'string' && text.trim()), scenario.id + ': ' + field);
    }
  }
});

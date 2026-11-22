import test from 'node:test';
import assert from 'node:assert/strict';
import { koreanTerms, searchKorean } from '../worker/korean-search.mjs';

const entries = [
  { id: 'implementation', files: [['SKILL.md', '기존 구현 인터페이스를 재사용하고 아키텍처를 검토합니다.']] },
  { id: 'execution', files: [['SKILL.md', '여러 작업을 병렬로 진행하는 전략과 의존성 관계를 검토합니다.']] },
  { id: 'roadmap', files: [['SKILL.md', '단기 목표와 중기 및 장기 로드맵 계획을 분리합니다.']] },
  { id: 'context', files: [['SKILL.md', '사용자 요구사항과 의도를 먼저 파악하여 판단합니다.']] },
];

test('한국어 조사와 활용형을 간단히 정규화한다', () => {
  assert.deepEqual(koreanTerms('이 작업을 병렬로 진행하는 게 좋을까?'), ['작업', '병렬', '진행']);
  assert.deepEqual(koreanTerms('기존 인터페이스를 재사용하는 게 좋을까?'), ['기존', '인터페이스', '재사용']);
});

test('한국어 문장으로 관련된 독립 자산을 찾는다', () => {
  const cases = [
    ['기존 인터페이스를 재사용하는 게 좋을까?', 'implementation'],
    ['이 작업을 병렬로 진행하는 게 좋을까?', 'execution'],
    ['단기 목표와 장기 로드맵은 어떻게 계획하지?', 'roadmap'],
    ['사용자 요구사항과 의도를 먼저 어떻게 파악할까?', 'context'],
  ];
  for (const [query, expected] of cases) {
    assert.equal(searchKorean(query, entries)[0], expected, query);
  }
});

test('비관련한 한글 질문은 모든 자산을 반환하지 않는다', () => {
  assert.deepEqual(searchKorean('강아지 사료 어떤 게 좋을까?', entries), []);
  assert.deepEqual(searchKorean('어떻게?', entries), []);
});

 test('한국어 발견은 본문과 함께 자산 설명 및 태그를 고려한다', () => {
  const candidates = [
    { id: 'a-incidental', files: [['SKILL.md', '병렬 실행 의존성']] },
    { id: 'z-purpose', description: '병렬 실행 의존성 판단', files: [['SKILL.md', '판단 기준']] },
  ];
  assert.deepEqual(searchKorean('병렬 의존성', candidates), ['z-purpose', 'a-incidental']);
  const unrelated = Array.from({ length: 1000 }, (_, i) => ({ id: 'noise-' + i, description: '병렬 처리', files: [['SKILL.md', '일반 설명']] }));
  assert.equal(searchKorean('병렬 의존성', [...unrelated, ...candidates])[0], 'z-purpose');
});

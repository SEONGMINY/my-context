import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

function contractViolations(files) {
  const issues = [];
  const required = [
    ['policy', /읽기 전용 활용을 직접 활성화/, 'user opt-in for read-only access'],
    ['policy', /조회 허용은 수정·설치·커밋·푸시·배포 허용이 아니다/, 'read does not grant write'],
    ['policy', /명시적으로 금지/, 'explicit denial must win'],
    ['workflow', /개인 원칙과 Playbook의 선택·조회는 이 Skill에 종속되지 않는다/, 'Skill-independent reading'],
    ['contracts', /명시적 사용자 요청 또는 사용자가 활성화한/, 'contract accepts opted-in reads'],
    ['contracts', /변경.*별도 사용자 요청과 검토·승인/, 'changes need separate approval'],
    ['manage', /일반 작업에서 개인 자산을 읽는 행위는 이 Skill의 호출을 요구하지 않는다/, 'management Skill is not a read dependency'],
    ['manage', /사용자가 명시적으로 변경을 요청하면/, 'management requires explicit request'],
    ['worker', /explicit user request or when the user has enabled an opt-in/, 'MCP allows opted-in reads'],
    ['worker', /does not grant write permission/, 'MCP read-only boundary'],
  ];
  for (const [file, pattern, description] of required) {
    if (!pattern.test(files[file])) issues.push(description);
  }
  if (/개인 지식 조회·변경은.*사용자 명시적 요청이 있을 때만/.test(files.contracts)) {
    issues.push('obsolete explicit-only rule in workflow contract');
  }
  if (/Use only when the user requests their personal principles/.test(files.worker)) {
    issues.push('obsolete explicit-only MCP instruction');
  }
  return issues;
}
function loadContracts() {
  return {
    policy: read('policies/asset-usage.md'),
    workflow: read('skills/development-workflow/SKILL.md'),
    contracts: read('skills/development-workflow/references/contracts.md'),
    manage: read('skills/manage-dev-knowledge/SKILL.md'),
    worker: read('worker/index.mjs'),
  };
}

test('공통 조회·변경 권한 계약을 변경하면 > 정책 충돌 검사를 거친다', () => {
  assert.deepEqual(contractViolations(loadContracts()), []);
});

test('이전의 명시적 요청 전용 계약과 무단 쓰기 확대를 다시 도입하면 > 실패로 감지한다', () => {
  const inputs = loadContracts();
  inputs.contracts += '\n- 개인 지식 조회·변경은 사용자 명시적 요청이 있을 때만 수행한다.';
  inputs.worker += '\ninstructions: Use only when the user requests their personal principles';
  inputs.policy = inputs.policy.replace('조회 허용은 수정·설치·커밋·푸시·배포 허용이 아니다', '조회 허용은 수정·설치·커밋·푸시·배포도 허용한다');
  const issues = contractViolations(inputs);
  assert.ok(issues.includes('obsolete explicit-only rule in workflow contract'));
  assert.ok(issues.includes('obsolete explicit-only MCP instruction'));
  assert.ok(issues.includes('read does not grant write'));
});

test('새 원칙 자산을 관리하면 > 독립 진입 파일과 본문 및 메타데이터를 보존한다', () => {
  const slugs = [
    'implementation-strategy', 'execution-strategy',
    'roadmap-planning', 'context-aware-reasoning',
  ];
  const names = new Set();
  for (const slug of slugs) {
    const path = 'content/personal/lookup-' + slug;
    const entry = read(path + '/SKILL.md');
    const body = read(path + '/knowledge.md');
    assert.match(entry, new RegExp('^name: lookup-' + slug + '$', 'm'));
    assert.match(entry, /^description: "[^\n]+"/m);
    assert.match(entry, /source: community/);
    assert.match(entry, /tags: "/);
    assert.match(entry, /knowledge.md/);
    assert.match(body, /판단 원칙/);
    names.add(slug);
  }
  assert.equal(names.size, slugs.length);
  assert.equal(existsSync(join(root, 'content/personal/lookup-development-principles')), false);
  assert.ok(readdirSync(join(root, 'content/personal')).some((name) => name === 'lookup-testing-principles'));
});

test('CI가 설치 안전성·한국어 검색·정책 계약을 함께 검사하도록 연결한다', () => {
  const workflow = read('.github/workflows/worker.yml');
  const pkg = JSON.parse(read('package.json'));
  assert.match(workflow, /Asset Integrity Gate\n\s+run: npm run test:integrity/);
  assert.match(pkg.scripts['test:integrity'], /asset-policy\.test\.mjs/);
  assert.match(pkg.scripts['test:integrity'], /asset-integrity\.test\.mjs/);
  assert.match(pkg.scripts['test:integrity'], /korean-search\.test\.mjs/);
  assert.match(workflow, /node --test test\/worker-mcp-use\.test\.mjs/);
});

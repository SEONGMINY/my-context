import test from 'node:test';
import assert from 'node:assert/strict';
import { timingSafeEqual } from 'node:crypto';
import worker from '../worker/index.mjs';
import release from '../.generated/worker/release.json' with { type: 'json' };

const resource = 'https://fixture.workers.dev/mcp';
const token = 'fixture-read-only-mcp-token';
const env = { MY_CONTEXT_MCP_TOKEN: token };
const skillId = 'workflows/development-workflow';

// Node and Workers expose constant-time comparison through different crypto APIs.
if (!crypto.subtle.timingSafeEqual) {
  crypto.subtle.timingSafeEqual = timingSafeEqual;
}

let requestId = 0;
async function call(method, params, authorization = `Bearer ${token}`) {
  const response = await worker.fetch(new Request(resource, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }),
  }), env);
  return response;
}

async function callTool(name, args) {
  const response = await call('tools/call', { name, arguments: args });
  assert.equal(response.status, 200, `${name}: HTTP ${response.status}`);
  const json = await response.json();
  assert.equal(json.error, undefined, JSON.stringify(json.error));
  return json.result;
}

function parsed(result) {
  return JSON.parse(result.content[0].text);
}

test('Skill이 로컬에 설치되지 않아도 MCP로 조회하면 > 게시된 본문과 참조 계약을 읽는다', async () => {
  // given: 실제 Worker 릴리스에는 개발 Workflow가 포함되어 있음
  assert.match(release.sha, /^[0-9a-f]{40}$/);
  assert.ok(release.entries.some((entry) => entry.id === skillId));

  // when: Skill 설치기 실행 없이 기존 읽기 전용 MCP 도구만 호출
  const discovered = parsed(await callTool('chub_search', { query: skillId }));
  assert.equal(discovered.revision, release.sha);
  assert.equal(discovered.results[0]?.id, skillId);
  const skill = await callTool('chub_get', { id: skillId });
  const contracts = await callTool('chub_get', { id: skillId, file: 'references/contracts.md' });

  // then: Skill과 상대 참조를 실제 읽고, 해당 릴리스 리비전을 확인
  assert.equal(skill.isError, undefined);
  assert.match(skill.content[0].text, /# 개발 작업 절차/);
  assert.match(contracts.content[0].text, /# 개발 작업 절차의 공통 계약/);
  assert.equal(parsed(await callTool('chub_list', {})).revision, release.sha);
});

test('읽기 전용 MCP로 공개되지 않은 항목을 요청하면 > 오류를 반환하고 설치 도구를 노출하지 않는다', async () => {
  // given: 네이티브 Skill 설치와 무관한 읽기 전용 MCP
  // when: 등록된 도구 목록과 잘못된 조회를 요청
  const response = await call('tools/list', {});
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.result.tools.map(({ name }) => name).sort(), ['chub_get', 'chub_list', 'chub_search']);
  const missing = await callTool('chub_get', { id: 'workflows/unpublished-workflow' });
  const parent = await callTool('chub_get', { id: skillId, file: '../SKILL.md' });

  // then: 서버는 설치 기능을 노출하지 않으며, 없는 자산과 잘못된 경로는 실패
  assert.equal(missing.isError, true);
  assert.equal(parent.isError, true);
});

test('인사이트 추출 Skill과 개인 개발 원칙을 게시하면 > MCP에서 두 자산을 읽을 수 있다', async () => {
  // given: 승인된 커밋으로 만들어진 배포 번들
  const insightId = 'workflows/extract-development-insights';
  const principleId = 'personal/lookup-development-principles';

  // when: 로컬 설치나 지식 변경 없이 두 항목을 조회
  const insightSearch = parsed(await callTool('chub_search', { query: insightId }));
  const principleSearch = parsed(await callTool('chub_search', { query: principleId }));
  assert.ok(insightSearch.results.some(({ id }) => id === insightId));
  assert.ok(principleSearch.results.some(({ id }) => id === principleId));
  const insight = await callTool('chub_get', { id: insightId });
  const principle = await callTool('chub_get', { id: principleId, file: 'knowledge.md' });

  // then: 두 원본이 읽히고 저장·수정 도구는 추가되지 않음
  assert.equal(insight.isError, undefined);
  assert.match(insight.content[0].text, /# 개발 경험에서 판단 원칙 추출/);
  assert.equal(principle.isError, undefined);
  assert.match(principle.content[0].text, /# 개발 판단 원칙/);
});

test('MCP 인증 없이 지침을 요청하면 > Skill 본문이 노출되지 않는다', async () => {
  // given: 인증된 클라이언트만 접근할 수 있는 MCP
  // when: 인증 정보 없이 조회 요청
  const response = await call('tools/call', {
    name: 'chub_get',
    arguments: { id: skillId },
  }, null);

  // then: 인증 거부
  assert.equal(response.status, 401);
});

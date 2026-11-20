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
  const discovered = parsed(await callTool('chub_search', { query: 'development-workflow' }));
  assert.equal(discovered.revision, release.sha);
  const discoveredId = discovered.results.find(({ id }) => id === skillId)?.id;
  assert.equal(discoveredId, skillId);
  const skill = await callTool('chub_get', { id: discoveredId });
  const contracts = await callTool('chub_get', { id: discoveredId, file: 'references/contracts.md' });

  // then: Skill과 상대 참조를 실제 읽고, 해당 릴리스 리비전을 확인
  assert.equal(skill.isError, undefined);
  assert.match(skill.content[0].text, /# 개발 작업 절차/);
  assert.doesNotMatch(skill.content[0].text, /# FILE: references\/contracts\.md/);
  assert.doesNotMatch(skill.content[0].text, /# 개발 작업 절차의 공통 계약/);
  assert.match(contracts.content[0].text, /# 개발 작업 절차의 공통 계약/);
  assert.equal(parsed(await callTool('chub_list', {})).revision, release.sha);
});

test('전체 조회를 명시하면 > 첨부를 포함하되 기본 조회 안내와 호환성을 유지한다', async () => {
  // given: 본문과 참조 첨부를 가진 게시 Skill
  const listed = await call('tools/list', {});
  assert.equal(listed.status, 200);
  const tools = (await listed.json()).result.tools;
  const get = tools.find(({ name }) => name === 'chub_get');
  assert.ok(get, 'MCP 조회 도구가 있어야 한다');
  assert.match(get.description, /Default: only SKILL.md or DOC.md/);
  assert.match(get.inputSchema.properties.full.description, /Defaults to false/);

  // when: 기존 전체 조회를 명시적으로 선택
  const all = await callTool('chub_get', { id: skillId, full: true });

  // then: 기존 응답 형식과 첨부 조회 동작이 보존된다
  assert.equal(all.isError, undefined);
  assert.match(all.content[0].text, /# FILE: SKILL.md/);
  assert.match(all.content[0].text, /# FILE: references\/contracts\.md/);
  assert.match(all.content[0].text, /# 개발 작업 절차의 공통 계약/);
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

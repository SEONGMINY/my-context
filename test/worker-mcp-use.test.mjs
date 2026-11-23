import test from 'node:test';
import assert from 'node:assert/strict';
import { posix } from 'node:path';
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

test('MCP에서 개발 Workflow를 조회하면 > 게시된 본문과 참조 계약을 읽는다', async () => {
  // given: 실제 Worker 릴리스에는 개발 Workflow가 포함되어 있음
  assert.match(release.sha, /^[0-9a-f]{40}$/);
  assert.ok(release.entries.some((entry) => entry.id === skillId));

  // when: 게시된 Workflow를 기존 읽기 전용 MCP 도구로 조회
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

test('읽기 전용 MCP에서 잘못된 항목·경로는 오류를 반환한다', async () => {
  // given: 읽기 전용 MCP
  // when: 등록된 도구 목록과 잘못된 조회를 요청
  const response = await call('tools/list', {});
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.result.tools.map(({ name }) => name).sort(), ['chub_get', 'chub_list', 'chub_search']);
  const missing = await callTool('chub_get', { id: 'workflows/unpublished-workflow' });
  const parent = await callTool('chub_get', { id: skillId, file: '../SKILL.md' });

  // then: 읽기 전용 도구만 제공하며 없는 자산과 잘못된 경로는 실패
  assert.equal(missing.isError, true);
  assert.equal(parent.isError, true);
});

test('인사이트 Skill과 독립 원칙을 게시하면 > 별도 Skill 호출 없이 MCP로 조회된다', async () => {
  const insightId = 'workflows/extract-development-insights';
  const insight = await callTool('chub_get', { id: insightId });
  assert.equal(insight.isError, undefined);
  assert.match(insight.content[0].text, /# 개발 경험에서 판단 원칙 추출/);
  const slugs = [
    'implementation-strategy', 'execution-strategy',
    'roadmap-planning', 'context-aware-reasoning',
    'risk-management', 'preventive-engineering',
  ];
  for (const slug of slugs) {
    const id = 'personal/lookup-' + slug;
    const found = parsed(await callTool('chub_search', { query: id }));
    assert.ok(found.results.some((item) => item.id === id), id);
    const entry = await callTool('chub_get', { id });
    const knowledge = await callTool('chub_get', { id, file: 'knowledge.md' });
    assert.equal(entry.isError, undefined);
    assert.equal(knowledge.isError, undefined);
    assert.match(entry.content[0].text, new RegExp('name: lookup-' + slug));
    assert.match(knowledge.content[0].text, /판단 원칙/);
  }
  const exploratoryQueries = [
    ['implementation-strategy', 'implementation interface architecture'],
    ['execution-strategy', 'parallelism subagents dependencies'],
    ['roadmap-planning', 'roadmap phased long term'],
    ['context-aware-reasoning', 'requirements decision context'],
    ['risk-management', 'risk management residual risk'],
    ['preventive-engineering', 'preventive engineering quality gates'],
  ];
  for (const [slug, query] of exploratoryQueries) {
    const id = 'personal/lookup-' + slug;
    const results = parsed(await callTool('chub_search', { query }));
    assert.ok(results.results.some((item) => item.id === id), 'Natural language search: ' + query);
  }
  const koreanQueries = [
    ['implementation-strategy', '기존 인터페이스를 재사용하는 게 좋을까?'],
    ['execution-strategy', '이 작업을 병렬로 진행하는 게 좋을까?'],
    ['roadmap-planning', '단기 목표와 장기 로드맵은 어떻게 계획하지?'],
    ['context-aware-reasoning', '사용자 요구사항과 의도를 먼저 어떻게 파악할까?'],
    ['risk-management', '위험 관리와 잔여 위험 대응 방안'],
    ['preventive-engineering', '구조적 예방과 재발 방지 통제'],
  ];
  for (const [slug, query] of koreanQueries) {
    const id = 'personal/lookup-' + slug;
    const results = parsed(await callTool('chub_search', { query }));
    assert.ok(results.results.slice(0, 3).some((item) => item.id === id), 'Korean top-3 search: ' + query);
  }
  const unrelated = parsed(await callTool('chub_search', { query: '고양이 모래 추천해줘' }));
  assert.equal(unrelated.total, 0, 'Unrelated Korean queries should not return every asset');
  const removed = await callTool('chub_get', { id: 'personal/lookup-development-principles' });
  assert.equal(removed.isError, true);
});

test('관리 Skill은 MCP로 조회할 수 있고 원본 변경 도구는 노출하지 않는다', async () => {
  const managerId = 'workflows/manage-dev-knowledge';
  const discovered = parsed(await callTool('chub_search', { query: managerId, limit: 3 }));
  assert.ok(discovered.results.some(({ id }) => id === managerId));
  const manager = await callTool('chub_get', { id: managerId, revision: discovered.revision });
  assert.equal(manager.isError, undefined);
  assert.match(manager.content[0].text, /# 개인 개발 지식 관리/);
  assert.match(manager.content[0].text, /읽기 전용 MCP/);
  assert.match(manager.content[0].text, /명시적 승인/);
  const listed = await call('tools/list', {});
  assert.deepEqual((await listed.json()).result.tools.map(({ name }) => name).sort(), ['chub_get', 'chub_list', 'chub_search']);
});


test('신규 범용 Skill 두 개를 원격 MCP에서 검색하고 독립 본문으로 조회한다', async () => {
  for (const [slug, heading] of [
    ['product-understanding', '# 프로덕트 이해'],
    ['documentation-review', '# 프로덕트 문서 검토'],
  ]) {
    const id = 'workflows/' + slug;
    assert.ok(release.entries.some((entry) => entry.id === id), id);
    const found = parsed(await callTool('chub_search', { query: id, limit: 2 }));
    assert.ok(found.results.some((entry) => entry.id === id), id);
    const fetched = await callTool('chub_get', { id, revision: found.revision });
    assert.equal(fetched.isError, undefined);
    assert.ok(fetched.content[0].text.includes(heading), id);
  }
  const tools = (await (await call('tools/list', {})).json()).result.tools;
  assert.deepEqual(tools.map(({ name }) => name).sort(), ['chub_get', 'chub_list', 'chub_search']);
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

// Relative Markdown file links in a published asset must be readable under the
// same asset ID. External URLs are source references, not MCP attachments.
function missingPublishedLinks(files) {
  const names = new Set(files.map(([name]) => name));
  const missing = [];
  for (const [name, body] of files) {
    if (!name.endsWith('.md')) continue;
    let fence = null;
    for (const line of body.split('\n')) {
      const marker = line.match(/^\s*(`{3,}|~{3,})/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
        continue;
      }
      if (fence) continue;
      for (const match of line.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
        const destination = match[1].trim().split(/\s+"/)[0];
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(destination)) continue;
        const raw = destination.split('#')[0];
        let target;
        try { target = posix.normalize(posix.join(posix.dirname(name), decodeURIComponent(raw))); }
        catch { missing.push(name + ': ' + destination); continue; }
        if (raw.startsWith('/') || target.startsWith('../') || !names.has(target)) {
          missing.push(name + ': ' + destination);
        }
      }
    }
  }
  return missing;
}

test('게시된 자산의 상대 파일 링크는 동일한 MCP 자산 내부에서 조회할 수 있다', () => {
  for (const entry of release.entries) {
    const fileSets = entry.type === 'skill' ? [entry.files]
      : entry.languages.flatMap(({ versions }) => versions.map(({ files }) => files));
    for (const files of fileSets) {
      assert.deepEqual(missingPublishedLinks(files), [], entry.id);
    }
  }
});

test('게시 참조 검사는 누락·자산 외부 경로를 탐지하고 외부 출처와 코드 예시를 허용한다', () => {
  const files = [
    ['SKILL.md', '[첨부](references/guide.md)\n[누락](missing.md)\n[외부 자산](../policy.md)\n[출처](https://example.org/policy.md)\n~~~md\n[예시](example.md)\n~~~'],
    ['references/guide.md', '[본문](../SKILL.md#intro)'],
  ];
  assert.deepEqual(missingPublishedLinks(files), [
    'SKILL.md: missing.md', 'SKILL.md: ../policy.md',
  ]);
});


test('discovery distinguishes judgment from procedure and guards release consistency', async () => {
  const found = parsed(await callTool('chub_search', { query: 'parallelism subagents dependencies', limit: 5 }));
  assert.ok(found.results.length <= 5);
  const principle = found.results.find(({ id }) => id === 'personal/lookup-execution-strategy');
  assert.equal(principle?.role, 'knowledge');
  const workflow = parsed(await callTool('chub_search', { query: skillId, limit: 1 })).results[0];
  assert.equal(workflow.id, skillId);
  assert.equal(workflow.role, 'procedure');
  const current = await callTool('chub_get', { id: principle.id, file: 'knowledge.md', revision: found.revision });
  assert.equal(current.isError, undefined);
  const stale = await callTool('chub_get', { id: principle.id, revision: '0'.repeat(40) });
  assert.equal(stale.isError, true);
  assert.equal(parsed(stale).available, release.sha);
});

test('mixed discovery surfaces strong Korean matches alongside BM25 and keeps exact IDs first', async () => {
  const searchIds = async (query, limit) =>
    parsed(await callTool('chub_search', { query, limit })).results.map(({ id }) => id);

  const implementationId = 'personal/lookup-implementation-strategy';
  assert.deepEqual(await searchIds('workflow', 1), [skillId]);
  assert.deepEqual(await searchIds('workflow 인터페이스', 1), [skillId]);
  assert.deepEqual(await searchIds('기존 인터페이스 재사용', 1), [implementationId]);
  assert.deepEqual(await searchIds('workflow 기존 인터페이스 재사용', 2), [implementationId, skillId]);
  assert.deepEqual(await searchIds(skillId, 1), [skillId]);
});

test('mixed discovery prioritizes a full asset name over generic matches', async () => {
  const cases = [
    ['Domain Storytelling 요구사항 검토', 'workflows/domain-storytelling'],
    ['Execution Strategy를 병렬 실행 판단에 활용', 'personal/lookup-execution-strategy'],
    ['workflows/domain-storytelling 요구사항 검토', 'workflows/domain-storytelling'],
  ];
  for (const [query, expected] of cases) {
    const { results } = parsed(await callTool('chub_search', { query, limit: 1 }));
    assert.equal(results[0]?.id, expected, query);
  }
  // A partial accidental prefix is not an exact asset name.
  const accidental = parsed(await callTool('chub_search', {
    query: 'xDomain Storytelling 요구사항 검토', limit: 1,
  }));
  assert.notEqual(accidental.results[0]?.id, 'workflows/domain-storytelling');
});

test('Korean discovery accepts canonically equivalent Unicode queries', async () => {
  const query = '기존 인터페이스 재사용';
  const composed = parsed(await callTool('chub_search', { query, limit: 3 }));
  const decomposed = parsed(await callTool('chub_search', { query: query.normalize('NFD'), limit: 3 }));
  assert.ok(composed.results.length > 0);
  assert.deepEqual(decomposed, composed);
});

test('discovery protocol exposes default autonomous read-only workflows and permission boundaries', async () => {
  const init = await call('initialize', {
    protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'fixture', version: '1' },
  });
  assert.equal(init.status, 200);
  const initialized = (await init.json()).result;
  assert.equal(initialized.serverInfo.version, release.sha);
  assert.match(initialized.instructions, /No separate opt-in toggle/);
  assert.match(initialized.instructions, /does not guarantee tool selection/);
  const listed = await call('tools/list', {});
  const tools = (await listed.json()).result.tools;
  assert.equal(tools.length, 3);
  assert.ok(tools.every(({ annotations }) => annotations?.readOnlyHint === true));
  for (const { description } of tools) {
    assert.match(description, /No separate opt-in toggle/);
    assert.match(description, /If the user excludes my-context for this task/);
    assert.match(description, /never authorizes additional private-data access or knowledge changes/);
  }
  const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool.description]));
  // Verify tool responsibilities without pinning full prose to specific examples.
  assert.match(byName.chub_search, /\b(?:search|find|discover)\b/i);
  assert.match(byName.chub_search, /\b(?:development|engineering)\b/i);
  assert.match(byName.chub_search, /\b(?:task|relevant)\b/i);
  assert.match(byName.chub_get, /\b(?:read|retrieve)\b/i);
  assert.match(byName.chub_get, /\bSKILL\.md\b/);
  assert.match(byName.chub_list, /\b(?:list|inventory)\b/i);
  // The server must remain read-only; agent autonomous selection requires separate E2E.
  assert.ok(Object.keys(byName).every((name) => ['chub_search', 'chub_get', 'chub_list'].includes(name)));
  const insight = parsed(await callTool('chub_search', {
    query: 'workflows/extract-development-insights', limit: 1,
  })).results[0];
  assert.equal(insight.id, 'workflows/extract-development-insights');
  assert.match(insight.description, /without a separate explicit Skill invocation/);
  assert.match(insight.description, /do not access additional private history or change stored knowledge without permission/);
});

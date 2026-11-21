import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, lstatSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

function discoverPersonalAssets(personalRoot) {
  const names = readdirSync(personalRoot);
  assert.ok(names.length > 0, 'Personal asset registry must not be empty');
  const seen = new Set();
  for (const slug of names) {
    const dir = join(personalRoot, slug);
    const stat = lstatSync(dir);
    assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), 'Asset must be a real directory: ' + slug);
    assert.match(slug, /^lookup-[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid personal asset slug: ' + slug);
    assert.ok(!seen.has(slug), 'Duplicate personal asset: ' + slug);
    seen.add(slug);
    const entryPath = join(dir, 'SKILL.md');
    const bodyPath = join(dir, 'knowledge.md');
    for (const file of [entryPath, bodyPath]) {
      assert.ok(existsSync(file), 'Missing required asset file: ' + file);
      const mode = lstatSync(file);
      assert.ok(mode.isFile() && !mode.isSymbolicLink(), 'Asset must be a regular file: ' + file);
    }
    const entry = readFileSync(entryPath, 'utf8');
    const body = readFileSync(bodyPath, 'utf8');
    const frontmatter = entry.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    assert.ok(frontmatter, 'Missing YAML frontmatter: ' + slug);
    const lines = frontmatter[1];
    assert.match(lines, new RegExp('^name: ' + slug + '$', 'm'), 'Incorrect asset name: ' + slug);
    assert.match(lines, /^description:\s*"?[A-Za-z][^\n]+"?$/m, 'Missing English description: ' + slug);
    assert.match(lines, /^metadata:\s*$/m, 'Missing metadata: ' + slug);
    assert.match(lines, /^\s+source:\s+community\s*$/m, 'Missing source metadata: ' + slug);
    assert.match(lines, /^\s+tags:\s*"?[a-z][^\n]+"?$/m, 'Missing English tags: ' + slug);
    assert.match(entry, /knowledge\.md/, 'Missing knowledge.md reference: ' + slug);
    assert.match(body.trim(), /^#\s+.+/m, 'Missing knowledge heading: ' + slug);
    assert.ok(body.trim().length >= 50, 'Empty or trivial knowledge body: ' + slug);
  }
  return names;
}

test('개인 지식 자산 전체를 자동 탐색해 새 원칙도 구조·메타데이터를 검사한다', () => {
  const slugs = discoverPersonalAssets(join(root, 'content/personal'));
  for (const expected of [
    'lookup-testing-principles',
    'lookup-implementation-strategy',
    'lookup-execution-strategy',
    'lookup-roadmap-planning',
    'lookup-context-aware-reasoning',
  ]) assert.ok(slugs.includes(expected), 'Existing asset must remain available: ' + expected);
  assert.equal(existsSync(join(root, 'content/personal/lookup-development-principles')), false);
});

test('다섯 번째 이후 원칙을 추가하더라도 누락·잘못된 메타데이터가 자동으로 거부된다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'my-context-assets-'));
  try {
    const asset = join(dir, 'lookup-future-principle');
    mkdirSync(asset);
    const entry = ['---', 'name: lookup-future-principle',
      'description: "Guidance for testing a future principle."',
      'metadata:', '  source: community',
      '  tags: "principles, testing"', '---', '',
      '# Future principle', '', 'Read knowledge.md as a reference.', ''].join('\n');
    writeFileSync(join(asset, 'SKILL.md'), entry);
    writeFileSync(join(asset, 'knowledge.md'), '# Future\n\nThis example is a sufficiently detailed future principle for validation.\n');
    assert.deepEqual(discoverPersonalAssets(dir), ['lookup-future-principle']);
    rmSync(join(asset, 'knowledge.md'));
    assert.throws(() => discoverPersonalAssets(dir), /Missing required asset file/);
    writeFileSync(join(asset, 'knowledge.md'), '# Future\n\nThis example is a sufficiently detailed future principle for validation.\n');
    writeFileSync(join(asset, 'SKILL.md'), entry.replace('name: lookup-future-principle', 'name: lookup-other'));
    assert.throws(() => discoverPersonalAssets(dir), /Incorrect asset name/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

test('published reusable skill has portable metadata and a real contract reference', () => {
  const skill = read('skills/development-workflow/SKILL.md');
  assert.match(skill, /^---\nname: development-workflow\ndescription: "[^\n]+"\n---\n/);
  assert.match(skill, /\]\(references\/contracts\.md\)/);
  assert.equal(existsSync(join(root, 'skills/development-workflow/references/contracts.md')), true);
  const manifest = JSON.parse(read('publish-skills.json'));
  assert.equal(manifest.includes('development-workflow'), true);
  assert.equal(manifest.includes('manage-dev-knowledge'), false);
});

test('methodology contracts define all six gates and preserve knowledge opt-in', () => {
  const skill = read('skills/development-workflow/SKILL.md');
  const contracts = read('skills/development-workflow/references/contracts.md');
  for (const gate of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']) {
    assert.match(skill, new RegExp('\\b' + gate + '\\b'));
    assert.match(contracts, new RegExp('\\b' + gate + '\\b'));
  }
  assert.match(skill, /사용자가 명시적으로 요청하지 않았다면.*개인 지식을 조회하거나 수정하지 않는다/);
  assert.match(contracts, /unknown\(미확인\).*암묵적으로 통과로 취급하지 않는다/);
});

test('behavior evaluation scenarios are well formed; this does NOT run a model', () => {
  const scenarios = JSON.parse(read('test/fixtures/workflow-scenarios.json'));
  assert.ok(scenarios.length >= 10);
  assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, scenarios.length);
  for (const scenario of scenarios) {
    assert.match(scenario.id, /^[a-z][a-z0-9-]+$/);
    assert.ok(typeof scenario.request === 'string' && scenario.request.trim());
    assert.ok(Array.isArray(scenario.expected) && scenario.expected.length);
    assert.ok(Array.isArray(scenario.forbidden) && scenario.forbidden.length);
  }
});

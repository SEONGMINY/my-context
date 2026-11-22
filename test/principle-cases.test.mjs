import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = fileURLToPath(new URL('./fixtures/personal-principle-scenarios.json', import.meta.url));
const scenarios = JSON.parse(readFileSync(path, 'utf8'));
const principles = ['CR', 'IS', 'ES', 'RP', 'RM', 'PE', 'EDI'];
const categories = ['normal', 'boundary', 'counterexample', 'cross'];

test('개인 원칙 행동 사례를 평가할 때 > 단일·경계·반례·복합 시나리오를 추적할 수 있다', () => {
  assert.ok(Array.isArray(scenarios) && scenarios.length > 0);
  const ids = new Set();
  for (const scenario of scenarios) {
    assert.match(scenario.id, /^(?:CR|IS|ES|RP|RM|PE|EDI|X)-\d{2}$/);
    assert.ok(!ids.has(scenario.id), 'Duplicate scenario ID: ' + scenario.id);
    ids.add(scenario.id);
    assert.ok(categories.includes(scenario.category), 'Unknown category: ' + scenario.id);
    assert.ok(Array.isArray(scenario.principles) && scenario.principles.length > 0);
    assert.equal(new Set(scenario.principles).size, scenario.principles.length);
    assert.ok(scenario.principles.every((name) => principles.includes(name)));
    assert.ok(scenario.context?.trim() && scenario.request?.trim(), 'Missing scenario context: ' + scenario.id);
    assert.ok(Array.isArray(scenario.expected) && scenario.expected.every((x) => typeof x === 'string' && x.trim()));
    assert.ok(scenario.expected.length > 0, 'Missing expected behavior: ' + scenario.id);
    assert.ok(Array.isArray(scenario.forbidden) && scenario.forbidden.every((x) => typeof x === 'string' && x.trim()));
    assert.ok(scenario.forbidden.length > 0, 'Missing forbidden behavior: ' + scenario.id);
    assert.equal(scenario.id.startsWith('X-'), scenario.category === 'cross');
    assert.equal(scenario.category === 'cross', scenario.principles.length > 1);
  }
  for (const name of principles) {
    const own = scenarios.filter((c) => c.principles.length === 1 && c.principles[0] === name);
    assert.ok(own.some((c) => c.category === 'normal'), 'Missing normal case: ' + name);
    assert.ok(own.some((c) => c.category === 'boundary'), 'Missing boundary case: ' + name);
    assert.ok(own.some((c) => c.category === 'counterexample'), 'Missing counterexample: ' + name);
    assert.ok(scenarios.some((c) => c.principles.length > 1 && c.principles.includes(name)), 'Missing cross case: ' + name);
  }
});

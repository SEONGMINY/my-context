import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, lstatSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

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


test('개인 자산을 게시 대상으로 추가하면 > 진입 파일과 메타데이터가 유효해야 한다', () => {
  assert.ok(discoverPersonalAssets(join(root, 'content/personal')).length > 0);
});

test('새 자산의 파일·메타데이터가 유효하지 않으면 > 게시 전 검사에서 거부한다', () => {
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


import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { checkMarkdownLinks, listMarkdownDocuments } from '../scripts/check-doc-links.mjs';

test('현재 유지보수 Markdown 문서의 상대 링크를 확인하면 > 파일·한글 앵커가 모두 유효하다', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const docs = listMarkdownDocuments(root);
  assert.ok(docs.includes(join(root, 'AGENTS.md')));
  assert.ok(docs.includes(join(root, 'skills/development-workflow/SKILL.md')));
  assert.ok(docs.includes(join(root, 'docs/DEPLOYMENT.md')));
  assert.deepEqual(checkMarkdownLinks(docs), []);
});

test('상대 문서 링크를 검사하면 > 누락 파일·한글 앵커와 중복 제목을 구분한다', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'my-context-md-links-'));
  try {
    mkdirSync(join(scratch, 'docs'));
    writeFileSync(join(scratch, 'README.md'), '# Intro\n## my-context MCP 연결하기\n## 반복 제목\n## 반복 제목\n');
    const guide = join(scratch, 'docs', 'DEPLOYMENT.md');
    writeFileSync(guide, [
      '[정상](../README.md#my-context-mcp-연결하기)',
      '[두 번째 제목](../README.md#반복-제목-1)',
      '[누락 제목](../README.md#과거-앵커)',
      '[누락 파일](./MISSING.md)',
      '\x60\x60\x60markdown',
      '[코드 예시](./NOT-A-LINK.md)',
      '\x60\x60\x60',
      '[외부 링크](https://example.org/does-not-need-network)',
      '',
    ].join('\n'));
    const errors = checkMarkdownLinks([guide]);
    assert.equal(errors.length, 2, errors.join('\n'));
    assert.match(errors.join('\n'), /missing heading: .*#과거-앵커/);
    assert.match(errors.join('\n'), /missing file: .*MISSING\.md/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

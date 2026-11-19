import { lstatSync, realpathSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPlannedSkillLinks } from './install-workflow-links.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'skills/development-workflow');
const args = process.argv.slice(2);
if (args.length > 1 || (args[0] && args[0] !== '--check')) {
  throw new Error('Usage: npm run install:workflow -- [--check]');
}
if (!existsSync(join(source, 'SKILL.md'))) {
  throw new Error('Missing development-workflow/SKILL.md');
}

// 기존 개인 Skill은 덮어쓰지 않는다. 모든 대상의 충돌을 확인한 뒤에만 설치한다.
const destinations = [
  join(homedir(), '.agents/skills/development-workflow'),
  join(homedir(), '.claude/skills/development-workflow'),
];

function inspect(destination) {
  let entry;
  try {
    entry = lstatSync(destination);
  } catch (error) {
    if (error.code === 'ENOENT') return { path: destination, action: 'link' };
    throw error;
  }

  // 깨진 심볼릭 링크도 비어 있는 경로가 아니라 기존 사용자 파일로 취급한다.
  let resolved;
  try {
    resolved = realpathSync(destination);
  } catch {
    throw new Error('Existing skill preserved; target differs: ' + destination);
  }
  if (!entry.isSymbolicLink() || resolved !== realpathSync(source)) {
    throw new Error('Existing skill preserved; target differs: ' + destination);
  }
  return { path: destination, action: 'keep' };
}

const plan = destinations.map(inspect);
if (!args.includes('--check')) applyPlannedSkillLinks(plan, source);

console.log(JSON.stringify({ mode: args.includes('--check') ? 'check' : 'install', skills: plan }, null, 2));
